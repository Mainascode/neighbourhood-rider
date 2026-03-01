import crypto from "crypto";
import { getStorageBucket } from "./firebaseAdmin.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionForMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

function parseImageDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("Invalid image format. Upload a JPG, PNG, or WEBP image.");
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw new Error("Image upload is empty.");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("Image is too large. Max size is 5MB.");
  }

  return { buffer, mimeType };
}

export async function uploadProfileImage({ dataUrl, userId, category = "rider" }) {
  if (!userId) throw new Error("Missing user id for image upload");
  const { buffer, mimeType } = parseImageDataUrl(dataUrl);
  const ext = extensionForMime(mimeType);
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
  const filePath = `profile-images/${category}/${String(userId)}/${Date.now()}-${hash}.${ext}`;

  const bucket = getStorageBucket();
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: "public,max-age=31536000",
    },
    resumable: false,
    validation: "md5",
  });

  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2100-01-01",
  });

  return { imageUrl: downloadUrl, storagePath: filePath };
}


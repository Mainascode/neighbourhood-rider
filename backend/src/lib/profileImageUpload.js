import crypto from "crypto";
import { getStorageBucket } from "./firebaseAdmin.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function createUploadError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

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
    throw createUploadError("Invalid image format. Upload a JPG, PNG, or WEBP image.", 400);
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createUploadError("Unsupported image type. Use JPG, PNG, or WEBP.", 400);
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    throw createUploadError("Image upload is empty.", 400);
  }
  if (buffer.length > MAX_BYTES) {
    throw createUploadError("Image is too large. Max size is 5MB.", 400);
  }

  return { buffer, mimeType };
}

export async function uploadProfileImage({ dataUrl, userId, category = "rider" }) {
  if (!userId) throw createUploadError("Missing user id for image upload", 400);
  const { buffer, mimeType } = parseImageDataUrl(dataUrl);
  const ext = extensionForMime(mimeType);
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
  const filePath = `profile-images/${category}/${String(userId)}/${Date.now()}-${hash}.${ext}`;

  const bucket = getStorageBucket();
  const file = bucket.file(filePath);

  try {
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
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("Firebase Admin env not configured")) {
      throw createUploadError("Firebase Admin is not configured on backend.", 500);
    }
    if (message.includes("No such object") || message.includes("The specified bucket does not exist")) {
      throw createUploadError("Firebase Storage bucket is not configured correctly.", 500);
    }
    if (message.includes("permission") || message.includes("forbidden") || message.includes("denied")) {
      throw createUploadError("Firebase Storage permission denied for upload.", 500);
    }
    throw createUploadError("Failed to upload profile picture to Firebase Storage.", 500);
  }
}

import admin from "firebase-admin";
import { getFirestore, getStorageBucket } from "../../lib/firebaseAdmin.js";
import { buildMarketplaceProductPrompt, generateImageWithImageGPT } from "../../lib/imageGpt.js";
import { hashPrompt, normalizeProductName } from "../../lib/aiImageCache.js";

async function imageResultToBuffer(imageResult) {
  if (imageResult.type === "base64") {
    return Buffer.from(imageResult.value, "base64");
  }
  if (imageResult.type === "url") {
    const remote = await fetch(imageResult.value);
    if (!remote.ok) throw new Error("Failed to download generated image");
    const arr = await remote.arrayBuffer();
    return Buffer.from(arr);
  }
  throw new Error("Unsupported generated image format");
}

export async function generateProductImage(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ error: "Only authenticated vendors can generate images" });
    }

    const { name, productName } = req.body || {};
    const originalName = String(productName || name || "").trim();
    if (!originalName) return res.status(400).json({ error: "Product name is required" });

    const normalizedName = normalizeProductName(originalName);
    if (!normalizedName) return res.status(400).json({ error: "Invalid product name after normalization" });

    const firestore = getFirestore();
    const cacheRef = firestore.collection("ai_image_cache").doc(normalizedName);
    const cacheDoc = await cacheRef.get();
    if (cacheDoc.exists) {
      const data = cacheDoc.data() || {};
      if (data.imageUrl) {
        await cacheRef.set(
          {
            usageCount: admin.firestore.FieldValue.increment(1),
          },
          { merge: true }
        );
        return res.status(200).json({
          success: true,
          imageUrl: data.imageUrl,
          normalizedName,
          cached: true,
        });
      }
    }

    const prompt = buildMarketplaceProductPrompt(originalName);
    const promptHash = hashPrompt(prompt);

    const imageResult = await generateImageWithImageGPT(originalName);
    const imageBuffer = await imageResultToBuffer(imageResult);

    const bucket = getStorageBucket();
    const fileName = `ai-generated/${normalizedName}.webp`;
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: { contentType: "image/webp", cacheControl: "public,max-age=31536000" },
      resumable: false,
      validation: "md5",
    });

    const [downloadUrl] = await file.getSignedUrl({
      action: "read",
      expires: "2100-01-01",
    });

    await cacheRef.set(
      {
        normalizedName,
        imageUrl: downloadUrl,
        promptHash,
        usageCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      imageUrl: downloadUrl,
      normalizedName,
      promptHash,
      storagePath: fileName,
      cached: false,
    });
  } catch (err) {
    console.error("AI product image generation error:", err);
    const message = err?.message || "Failed to generate product image";
    const status = /image|generation|openai|imagegpt|timeout|fetch/i.test(message) ? 502 : 500;
    return res.status(status).json({ error: message });
  }
}

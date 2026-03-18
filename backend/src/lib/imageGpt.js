function extractImageFromPayload(payload) {
  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return { type: "base64", value: item.b64_json };
  }
  if (item?.url) {
    return { type: "url", value: item.url };
  }
  throw new Error("ImageGPT did not return image data");
}

export function buildMarketplaceProductPrompt(productName) {
  const name = String(productName || "").trim();
  if (!name) throw new Error("Product name is required");

  return `High-quality photorealistic 1:1 square product image of ${name},
clean white background,
studio lighting,
soft natural shadow,
centered composition,
food delivery mobile app style,
no text, no watermark,
no logos.
Maintain consistent lighting and background style across all generated images for brand consistency.`;
}

export async function generateImageWithImageGPT(productName) {
  const apiKey = process.env.IMAGEGPT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("IMAGEGPT_API_KEY is not configured");

  const apiUrl = process.env.IMAGEGPT_API_URL || "https://api.openai.com/v1/images/generations";
  const model = process.env.IMAGEGPT_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = "800x800";
  const prompt = buildMarketplaceProductPrompt(productName);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      output_format: "webp",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Image generation failed");
  }

  return extractImageFromPayload(payload);
}

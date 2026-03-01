import { buildProductImagePrompt } from "./productImagePrompt.js";

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = process.env.OPENAI_IMAGE_SIZE || "1024x1024";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return { apiKey, model, size };
}

export async function generateProductImageDataUrl({ productName, category }) {
  const { apiKey, model, size } = getOpenAIConfig();
  const prompt = buildProductImagePrompt(productName, { category });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "OpenAI image generation failed";
    throw new Error(message);
  }

  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item?.url) {
    return item.url;
  }

  throw new Error("No image returned from OpenAI image API");
}

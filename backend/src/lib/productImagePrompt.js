function normalizeProductName(name) {
  return String(name || "").trim();
}

export function buildProductImagePrompt(productName, options = {}) {
  const normalized = normalizeProductName(productName);
  if (!normalized) {
    throw new Error("Product name is required to generate image prompt.");
  }

  const category = String(options.category || "food").toLowerCase();
  const isGroceryOrPharmacy = category === "grocery" || category === "pharmacy";

  if (isGroceryOrPharmacy) {
    return [
      "You are generating high-quality product packshot images for a grocery delivery app.",
      "",
      "Style:",
      "- Clean white background",
      "- Product isolated",
      "- Centered",
      "- Retail photography style",
      "- Realistic packaging",
      "- No branding conflicts",
      "- No watermark",
      "- Soft shadow",
      "- 1:1 ratio",
      "- 800x800",
      "",
      "Maintain consistent lighting, color temperature, and background style across all generated images for brand consistency.",
      "",
      `Generate: ${normalized}`,
      "",
      "Photorealistic, ultra detailed, high resolution, commercial food photography.",
    ].join("\n");
  }

  return [
    "You are generating high-quality product images for a food delivery mobile app similar to Uber Eats and Glovo.",
    "",
    "Style Requirements:",
    "- Square format (1:1 ratio)",
    "- 800x800 resolution",
    "- Clean white or very light neutral background",
    "- Soft natural shadow under the product",
    "- Studio lighting",
    "- Professional food photography",
    "- No text, no watermark",
    "- No logos",
    "- No plates unless necessary",
    "- Product centered",
    "- Slight depth, realistic texture",
    "- Modern mobile app aesthetic",
    "- Looks premium and appetizing",
    "",
    "Camera Style:",
    "- Top view OR 45-degree angle",
    "- Shallow depth of field",
    "- Sharp focus on food",
    "- Natural color grading",
    "",
    "Maintain consistent lighting, color temperature, and background style across all generated images for brand consistency.",
    "",
    `Now generate an image of: ${normalized}`,
    "",
    "Photorealistic, ultra detailed, high resolution, commercial food photography.",
  ].join("\n");
}

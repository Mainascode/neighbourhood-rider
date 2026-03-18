import Product from "../models/Product.js";
import SystemSetting from "../models/SystemSetting.js";
import { DEFAULT_PRODUCTS } from "./constants.js";

export async function ensureDefaultProducts() {
  const count = await Product.countDocuments();

  if (count === 0) {
    await Product.insertMany(DEFAULT_PRODUCTS);
  }
}

export async function ensureSystemSettings() {
  const existing = await SystemSetting.findOne({ key: "global_config" });

  if (!existing) {
    return SystemSetting.create({ key: "global_config", weather: "sunny", isRaining: false });
  }

  const nextIsRaining = existing.weather === "rainy";
  if (existing.isRaining !== nextIsRaining) {
    existing.isRaining = nextIsRaining;
    await existing.save();
  }

  return existing;
}

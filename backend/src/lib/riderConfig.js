import SystemSetting from "../models/SystemSetting.js";
import Vendor from "../models/Vendor.js";
import Order from "../models/Order.js";

export async function getRiderAcceptTimeoutSeconds(orderId) {
  let order = null;
  if (orderId) {
    order = await Order.findById(orderId).select("vendorId");
  }

  if (order?.vendorId) {
    const vendor = await Vendor.findById(order.vendorId).select("riderAcceptTimeoutSeconds");
    if (vendor?.riderAcceptTimeoutSeconds) return vendor.riderAcceptTimeoutSeconds;
  }

  let settings = await SystemSetting.findOne({ key: "global_config" });
  if (!settings) settings = await SystemSetting.create({});
  return settings.riderAcceptTimeoutSeconds || 30;
}

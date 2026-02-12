import express from "express";
import User from "../../models/User.js";
import Vendor from "../../models/Vendor.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { calculateOrderPricing } from "../../lib/pricing.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

const router = express.Router();

const seedVendorInventory = [
  { name: "Milk 500ml", price: 70 },
  { name: "Bread", price: 60 },
  { name: "Eggs 6 pack", price: 90 },
  { name: "Rice 1kg", price: 160 },
  { name: "Sugar 1kg", price: 140 },
];

const gpsSimulators = new Map();

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function startGpsSimulation(order, io) {
  if (!order?._id || gpsSimulators.has(order._id.toString())) return;

  const start = order.pickup?.location?.coordinates || [36.8219, -1.2921];
  const end = order.dropoff?.location?.coordinates || [36.8219, -1.2921];

  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    if (t >= 1) t = 1;

    const lng = lerp(start[0], end[0], t);
    const lat = lerp(start[1], end[1], t);

    io.to(`order:${order._id}`).emit("rider:location:update", {
      lat,
      lng,
      riderId: order.riderId,
      simulated: true,
    });

    if (t >= 1) {
      clearInterval(interval);
      gpsSimulators.delete(order._id.toString());
    }
  }, 2000);

  gpsSimulators.set(order._id.toString(), interval);
}

function stopGpsSimulation(orderId) {
  const interval = gpsSimulators.get(orderId);
  if (interval) {
    clearInterval(interval);
    gpsSimulators.delete(orderId);
  }
}

// POST /api/admin/test/seed-vendors
router.post("/seed-vendors", async (req, res) => {
  try {
    const { count = 3 } = req.body || {};

    const created = [];
    for (let i = 0; i < count; i += 1) {
      const email = `vendor${Date.now()}_${i}@nr.test`;
      const user = await User.create({
        name: `Test Vendor ${i + 1}`,
        email,
        password: "password123",
        role: "vendor",
      });

      const vendor = await Vendor.create({
        userId: user._id,
        storeName: `Test Shop ${i + 1}`,
        phone: "+254700000000",
        address: "Nairobi",
        status: "approved",
        isManuallyClosed: false,
        inventory: seedVendorInventory,
        location: { type: "Point", coordinates: [36.8219, -1.2921] },
      });

      created.push({ user, vendor });
    }

    res.json({ createdCount: created.length, created });
  } catch (err) {
    console.error("Seed vendors error:", err);
    res.status(500).json({ message: "Failed to seed vendors" });
  }
});

// POST /api/admin/test/seed-all
router.post("/seed-all", async (req, res) => {
  try {
    const emailUser = `user${Date.now()}@nr.test`;
    const emailVendor = `vendor${Date.now()}@nr.test`;
    const emailRider = `rider${Date.now()}@nr.test`;

    const user = await User.create({
      name: "Test User",
      email: emailUser,
      password: "password123",
      role: "user",
    });

    const vendorUser = await User.create({
      name: "Test Vendor",
      email: emailVendor,
      password: "password123",
      role: "vendor",
    });

    const vendor = await Vendor.create({
      userId: vendorUser._id,
      storeName: "Test Shop",
      phone: "+254700000000",
      address: "Nairobi",
      status: "approved",
      isManuallyClosed: false,
      inventory: seedVendorInventory,
      location: { type: "Point", coordinates: [36.8219, -1.2921] },
    });

    const riderUser = await User.create({
      name: "Test Rider",
      email: emailRider,
      password: "password123",
      role: "rider",
    });

    const rider = await Rider.create({
      userId: riderUser._id,
      name: "Test Rider",
      phone: "+254700000001",
      status: "ONLINE_AVAILABLE",
      isAvailable: true,
      approvalStatus: "approved",
      location: { type: "Point", coordinates: [36.8219, -1.2921] },
      lastSeen: new Date(),
    });

    res.json({ success: true, user, vendor, rider });
  } catch (err) {
    console.error("Seed all error:", err);
    res.status(500).json({ message: "Failed to seed all" });
  }
});

// POST /api/admin/test/seed-user
router.post("/seed-user", async (_req, res) => {
  try {
    const email = `user${Date.now()}@nr.test`;
    const user = await User.create({
      name: "Test User",
      email,
      password: "password123",
      role: "user",
    });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Seed user error:", err);
    res.status(500).json({ message: "Failed to seed user" });
  }
});

// POST /api/admin/test/seed-rider-online
router.post("/seed-rider-online", async (_req, res) => {
  try {
    const email = `rider${Date.now()}@nr.test`;
    const user = await User.create({
      name: "Test Rider",
      email,
      password: "password123",
      role: "rider",
    });

    const rider = await Rider.create({
      userId: user._id,
      name: "Test Rider",
      phone: "+254700000001",
      status: "ONLINE_AVAILABLE",
      isAvailable: true,
      approvalStatus: "approved",
      location: { type: "Point", coordinates: [36.8219, -1.2921] },
      lastSeen: new Date(),
    });

    res.json({ success: true, user, rider });
  } catch (err) {
    console.error("Seed rider error:", err);
    res.status(500).json({ message: "Failed to seed rider" });
  }
});

// POST /api/admin/test/flow
router.post("/flow", async (req, res) => {
  try {
    const { userId, vendorId, riderUserId } = req.body || {};

    const user = userId ? await User.findById(userId) : await User.findOne({ role: "user" });
    if (!user) return res.status(404).json({ message: "No user found" });

    let vendor = null;
    if (vendorId) {
      vendor = await Vendor.findById(vendorId);
    } else {
      vendor = await Vendor.findOne({ status: "approved" });
    }
    if (!vendor) return res.status(404).json({ message: "No vendor found" });

    let rider = null;
    if (riderUserId) {
      rider = await Rider.findOne({ userId: riderUserId });
    } else {
      rider = await Rider.findOne({ status: "ONLINE_AVAILABLE" });
    }
    if (!rider) return res.status(404).json({ message: "No rider found (set one online)" });

    const items = vendor.inventory?.slice(0, 3) || seedVendorInventory.slice(0, 3);
    const goodsTotal = items.reduce((sum, i) => sum + (i.price || 0), 0);

    const { pricing, distribution } = await calculateOrderPricing(
      goodsTotal,
      { lat: vendor.location?.coordinates?.[1] || -1.2921, lng: vendor.location?.coordinates?.[0] || 36.8219 },
      { lat: -1.2921, lng: 36.8219 },
      {}
    );

    const order = await Order.create({
      userId: user._id,
      vendorId: vendor._id,
      items,
      pickup: {
        address: vendor.address || "Vendor Location",
        location: vendor.location,
      },
      dropoff: {
        address: "User Location",
        location: { type: "Point", coordinates: [36.8219, -1.2921] },
      },
      status: ORDER_STATUS.CREATED,
      pricing,
      distribution,
      goodsTotal: pricing.goodsTotal,
      deliveryFee: pricing.deliveryFee,
      amount: pricing.totalCost,
      isDeliveryFeePaid: true,
      paid: true,
      goodsPaid: true,
      riderId: rider._id,
      riderAssignedAt: new Date(),
      etaMinutes: pricing.etaMinutes,
    });

    const io = req.app.get("io");

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.CREATED,
      toStatus: ORDER_STATUS.PAYMENT_CONFIRMED,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
    });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.PAYMENT_CONFIRMED,
      toStatus: ORDER_STATUS.VENDOR_ACCEPTED,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
    });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.VENDOR_ACCEPTED,
      toStatus: ORDER_STATUS.PREPARING,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
    });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.PREPARING,
      toStatus: ORDER_STATUS.READY_FOR_PICKUP,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
    });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.READY_FOR_PICKUP,
      toStatus: ORDER_STATUS.RIDER_ASSIGNED,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
      set: { riderId: rider._id, riderAssignedAt: new Date() }
    });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: ORDER_STATUS.RIDER_ASSIGNED,
      toStatus: ORDER_STATUS.ON_THE_WAY,
      actor: { role: "system", name: "test_flow" },
      source: "test_flow",
      io,
    });

    startGpsSimulation(order, io);

    // Simulate delivery after 3s
    setTimeout(async () => {
      try {
        await updateOrderStatus({
          orderId: order._id,
          fromStatusRaw: ORDER_STATUS.ON_THE_WAY,
          toStatus: ORDER_STATUS.DELIVERED,
          actor: { role: "system", name: "test_flow" },
          source: "test_flow",
          io,
        });
      } catch (e) {
        console.error("Test flow delivery error:", e.message);
      }
    }, 3000);

    res.json({ success: true, orderId: order._id, order });
  } catch (err) {
    console.error("Test flow error:", err);
    res.status(500).json({ message: "Failed to run test flow" });
  }
});

// POST /api/admin/test/simulate-gps
router.post("/simulate-gps", async (req, res) => {
  try {
    const { orderId, action } = req.body || {};
    if (!orderId) return res.status(400).json({ message: "orderId required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const io = req.app.get("io");

    if (action === "stop") {
      stopGpsSimulation(orderId);
      return res.json({ success: true, status: "stopped" });
    }

    startGpsSimulation(order, io);
    res.json({ success: true, status: "started" });
  } catch (err) {
    console.error("Sim GPS error:", err);
    res.status(500).json({ message: "Failed to simulate GPS" });
  }
});

export default router;

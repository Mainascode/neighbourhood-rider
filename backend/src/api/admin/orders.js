import express from "express";
import Order from "../../models/Order.js";

const router = express.Router();

// GET all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .populate("riderId", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;

import express from "express";
import Order from "../../models/Order.js";
import { ok, fail } from "../../lib/response.js";

const router = express.Router();

/**
 * GET /api/orders/my
 * - CUSTOMER: their orders
 */
router.get("/", async (req, res) => {
  try {
    const user = req.user;
    const query = user.role === "admin" ? {} : { userId: user._id };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name phone email");

    return ok(res, orders);
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to fetch orders", 500);
  }
});

export default router;

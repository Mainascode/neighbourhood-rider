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
      .select("userId items finalItems customerNote status paid goodsTotal estimatedTotal finalTotal amount deliveryFee isDeliveryFeePaid isReceived isReviewed paidAt deliveredAt reviewedAt createdAt updatedAt dropoff pickup paymentMethod")
      .sort({ createdAt: -1 })
      .limit(user.role === "admin" ? 100 : 50)
      .populate("userId", "name phone email")
      .lean();

    return ok(res, orders);
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to fetch orders", 500);
  }
});

export default router;

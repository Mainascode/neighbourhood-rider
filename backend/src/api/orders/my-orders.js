import express from "express";
import Order from "../../models/Order.js";
import { ok, fail } from "../../lib/response.js";

const router = express.Router();

/**
 * GET /api/orders/my
 * - CUSTOMER: their orders
 * - RIDER: assigned orders
 */
router.get("/", async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === "rider") {
      // Need to find Rider Profile ID first, because Order stores riderId (Rider Model), not userId
      await import("../../models/Rider.js").then(async ({ default: Rider }) => {
        const riderProfile = await Rider.findOne({ userId: user._id });
        if (riderProfile) {
          query.riderId = riderProfile._id;
        } else {
          // If no profile, they can't have orders
          query.riderId = null;
        }
      });
    } else {
      // Normal user, query by userId
      query.userId = user._id;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("riderId", "name phone") // Correct field: riderId
      .populate("userId", "name phone"); // Correct field: userId (was customer)

    return ok(res, orders);
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to fetch orders", 500);
  }
});

export default router;

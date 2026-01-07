import express from "express";
import Order from "../../models/Order.js";

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

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

export default router;

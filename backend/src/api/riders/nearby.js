import express from "express";
import Rider from "../../models/Rider.js";

const router = express.Router();

/**
 * GET /api/riders/nearby?lat=&lng=
 */
router.get("/", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: "Location required" });
  }

  const riders = await Rider.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: 5000, // 5km
      },
    },
    online: true,
  }).limit(10);

  res.json(riders);
});

export default router;

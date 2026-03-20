import express from "express";

const router = express.Router();

/**
 * GET /api/riders/nearby?lat=&lng=
 */
router.get("/", async (req, res) => {
  return res.status(200).json({
    success: true,
    riders: [],
    message: "Rider system disabled in single-admin mode",
  });
});

export default router;

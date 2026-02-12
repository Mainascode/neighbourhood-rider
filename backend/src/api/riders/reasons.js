import express from "express";

const router = express.Router();

router.get("/offline-reasons", (req, res) => {
  res.json([
    { code: "BREAK", label: "On a break" },
    { code: "OFF_SHIFT", label: "Off shift" },
    { code: "VEHICLE", label: "Vehicle issue" },
    { code: "BATTERY", label: "Battery / fuel" },
    { code: "OTHER", label: "Other" },
  ]);
});

export default router;

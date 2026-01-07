import express from "express";
import Order from "../../models/Order.js";
import { assignBestRider } from "../../lib/matchRider.js";

const router = express.Router();

// POST /api/orders/bot-create
router.post("/", async (req, res) => {
    try {
        const { items, location, email, total } = req.body;

        // Create Order
        const newOrder = await Order.create({
            pickup: {
                address: location,
                location: { type: "Point", coordinates: [0, 0] }, // Placeholder
            },
            dropoff: location, // Assuming dropoff is same or extracted text
            items: typeof items === "string" ? items.split(",") : items,
            amount: 0, // Pending calculation
            isBotOrder: true,
            status: "pending",
            // userId: null (Guest)
        });

        // Auto Assign!
        const assignedRider = await assignBestRider(newOrder);

        // Notify Admin via Socket (if available in global context or attached to req)
        const io = req.app.get("io");
        if (io) {
            io.emit("admin:order:new", newOrder);
            if (assignedRider) {
                // Notify Rider individually if socket mapped
                // io.to(riderSocketId).emit(...)
            }
        }

        res.status(201).json({
            order: newOrder,
            assignedRider: assignedRider ? {
                name: assignedRider.name,
                phone: assignedRider.phone,
                vehicle: assignedRider.vehicle || "Motorbike" // Fallback if vehicle info missing
            } : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create bot order" });
    }
});

export default router;

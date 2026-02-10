import express from "express";
import Order from "../../models/Order.js";
import { assignBestRider } from "../../lib/matchRider.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

const router = express.Router();

// POST /api/orders/bot-create
router.post("/", async (req, res) => {
    try {
        const { items, location, email, lat, lng } = req.body;

        // Create Order
        const newOrder = await Order.create({
            pickup: {
                address: location,
                location: {
                    type: "Point",
                    coordinates: [lng || 36.8219, lat || -1.2921] // [lng, lat] GeoJSON
                },
            },
            dropoff: location, // Assuming dropoff is same or extracted text
            items: typeof items === "string" ? items.split(",") : items,
            amount: 0, // Pending calculation
            isBotOrder: true,
            status: ORDER_STATUS.CREATED,
            // userId: null (Guest) or we can try to find user by email?
            // checking if user exists by email would be nice to link it.
        });

        const io = req.app.get("io");
        const actor = { role: "system", name: "bot_create" };
        const first = await updateOrderStatus({
            orderId: newOrder._id,
            fromStatusRaw: newOrder.status,
            toStatus: ORDER_STATUS.PAYMENT_PENDING,
            actor,
            source: "orders.bot-create",
            io,
        });
        const second = await updateOrderStatus({
            orderId: newOrder._id,
            fromStatusRaw: first.status,
            toStatus: ORDER_STATUS.PAYMENT_CONFIRMED,
            actor,
            source: "orders.bot-create",
            io,
        });
        const third = await updateOrderStatus({
            orderId: newOrder._id,
            fromStatusRaw: second.status,
            toStatus: ORDER_STATUS.VENDOR_ACCEPTED,
            actor,
            source: "orders.bot-create",
            io,
        });
        const fourth = await updateOrderStatus({
            orderId: newOrder._id,
            fromStatusRaw: third.status,
            toStatus: ORDER_STATUS.PREPARING,
            actor,
            source: "orders.bot-create",
            io,
        });
        await updateOrderStatus({
            orderId: newOrder._id,
            fromStatusRaw: fourth.status,
            toStatus: ORDER_STATUS.READY_FOR_PICKUP,
            actor,
            source: "orders.bot-create",
            io,
        });

        // Auto Assign!
        const assignedRider = await assignBestRider(newOrder);
        if (assignedRider) {
            await updateOrderStatus({
                orderId: newOrder._id,
                fromStatusRaw: ORDER_STATUS.READY_FOR_PICKUP,
                toStatus: ORDER_STATUS.RIDER_ASSIGNED,
                actor,
                source: "orders.bot-create",
                io,
                set: { riderId: assignedRider._id, riderAssignedAt: new Date() },
            });
        }

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

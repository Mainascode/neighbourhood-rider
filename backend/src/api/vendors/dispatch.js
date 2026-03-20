
import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import Rider from "../../models/Rider.js";
import { assignBestRider, findNearestRiders } from "../../lib/matchRider.js";
import requireAuth from "../../middleware/auth.js";
import { sendNotification } from "../../lib/notificationService.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import { isRuakaLaunchModeEnabled } from "../../lib/launchMode.js";

/**
 * POST /api/vendors/orders/dispatch
 * Vendor requests a rider for a specific order
 */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const user = requireAuth(req);
    await connectDB();

    const { orderId } = req.body;

    /* Time Validation */
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 6 || currentHour >= 21) {
        return res.status(400).json({
            message: "System closed. Operating hours: 06:00 - 21:00.",
            systemClosed: true
        });
    }

    // Verify Vendor Ownership
    const vendor = await Vendor.findOne({ userId: user.id });
    if (!vendor) return res.status(403).json({ message: "Not a vendor" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.vendorId.toString() !== vendor._id.toString()) {
        return res.status(403).json({ message: "Unauthorized order access" });
    }

    // Find and Assign Rider
    // Reuse existing logic: Find Best Rider and Assign
    const riders = await findNearestRiders(vendor.location.coordinates[0], vendor.location.coordinates[1]);
    const assignedRider = await assignBestRider(order);

    if (assignedRider) {
        await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.RIDER_ASSIGNED,
            actor: { id: user.id, role: user.role, name: user.name },
            source: "vendors.dispatch",
            io: req.app.get("io"),
            set: {
                riderId: assignedRider._id,
                riderAssignedAt: new Date(),
                riderResponseStatus: "PENDING",
                riderAcceptedAt: null,
                riderRejectedAt: null,
                riderRejectionReason: "",
            },
        });

        await Rider.findByIdAndUpdate(assignedRider._id, { status: "ONLINE_BUSY", isAvailable: false, currentOrders: 1 });

        const io = req.app.get("io");
        if (io) {
            const riderPayload = {
                _id: String(order._id),
                orderId: String(order._id),
                status: ORDER_STATUS.RIDER_ASSIGNED,
                title: "New Delivery Request",
                body: `Pickup at ${order.pickup?.address || vendor.storeName || "pickup location"} • Earn KES ${Number(order.deliveryFee || 0)}`,
                pickupAddress: order.pickup?.address || vendor.storeName || "Pickup location",
                estimatedEarnings: Number(order.deliveryFee || 0),
                acceptBy: Date.now() + 30000,
            };
            io.to(`order:${order._id}`).emit("order:update", order);
            io.emit(`rider:order:${assignedRider.userId}`, riderPayload);
            io.to(`rider:${assignedRider.userId}`).emit("rider:new_order", riderPayload);
            io.to(`rider:${assignedRider.userId}`).emit("delivery:request", riderPayload);
        }

        await sendNotification({
            recipientId: assignedRider.userId,
            recipientType: "RIDER",
            title: "New Delivery Request",
            body: `Pickup at ${order.pickup?.address || vendor.storeName || "pickup location"} • Earn KES ${Number(order.deliveryFee || 0)}`,
            data: { orderId: String(order._id) },
            eventType: "NEW_DELIVERY_REQUEST",
            deepLink: "/rider/dashboard",
            orderId: String(order._id),
            type: "ALERT",
            category: "orderUpdates",
            io: req.app.get("io"),
        });

        // Auto-reassign after 30s if no rider response
        setTimeout(async () => {
            try {
                const launchMode = isRuakaLaunchModeEnabled();
                const currentOrder = await Order.findById(order._id);
                if (!currentOrder) return;
                const stillPending = currentOrder.status === ORDER_STATUS.RIDER_ASSIGNED
                    && currentOrder.riderId?.toString() === assignedRider._id.toString()
                    && currentOrder.riderResponseStatus !== "ACCEPTED";
                if (!stillPending) return;

                await updateOrderStatus({
                    orderId: currentOrder._id,
                    fromStatusRaw: currentOrder.status,
                    toStatus: launchMode ? ORDER_STATUS.PENDING_RIDER : ORDER_STATUS.READY_FOR_PICKUP,
                    actor: { role: "system", name: "vendors.dispatch.timeout" },
                    source: "vendors.dispatch.timeout",
                    reason: "RIDER_TIMEOUT",
                    io: req.app.get("io"),
                    set: {
                        riderId: null,
                        riderResponseStatus: "PENDING",
                        riderAcceptedAt: null,
                        riderRejectedAt: null,
                        riderRejectionReason: "",
                    },
                });

                await Rider.findByIdAndUpdate(assignedRider._id, { status: "ONLINE_AVAILABLE", isAvailable: true, currentOrders: 0 });

                if (!launchMode) {
                    const { matchOrder } = await import("../../services/matching.js");
                    const pickup = {
                        lat: currentOrder.pickup?.location?.coordinates?.[1],
                        lng: currentOrder.pickup?.location?.coordinates?.[0],
                    };
                    if (Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng)) {
                        matchOrder(String(currentOrder._id), pickup, 1, [String(assignedRider._id)], req.app.get("io"), Date.now());
                    }
                }
            } catch (err) {
                console.error("Vendor dispatch timeout reassign error:", err);
            }
        }, 30000);

        return res.json({ success: true, message: "Rider requested and assigned", assignedRider: assignedRider.name });
    } else {
        // If no rider found locally, maybe broadcast?
        // For now tell vendor "No riders nearby"
        return res.status(404).json({ success: false, message: "No nearby riders found" });
    }
}

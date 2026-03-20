
import Rider from "../models/Rider.js";
import { recordAssignment } from "../lib/penalties.js";
import { ORDER_STATUS, updateOrderStatus } from "../lib/orderStatus.js";
import Order from "../models/Order.js";
import { getRiderAcceptTimeoutSeconds } from "../lib/riderConfig.js";
import { sendNotification } from "../lib/notificationService.js";
import { isRuakaLaunchModeEnabled } from "../lib/launchMode.js";

/**
 * Finds the nearest available rider to the given location.
 * Criteria:
 * - status: ONLINE_AVAILABLE
 * - lastSeen: within last 120 seconds
 * - Excludes specific rider IDs (for retry logic)
 * - Sort by distance
 * 
 * @param {Object} pickupLocation - { lat, lng }
 * @param {Array<string>} excludeRiderIds - IDs to exclude
 * @returns {Promise<Object|null>} - The nearest rider or null
 */
export async function findNearestAvailableRider(pickupLocation, excludeRiderIds = []) {
    if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng) {
        throw new Error("Invalid pickup location");
    }

    const staleWindowMs = Number(process.env.RIDER_MATCH_STALE_MS || 24 * 60 * 60 * 1000);
    const staleCutoff = new Date(Date.now() - staleWindowMs);

    const query = {
        isOnline: true,
        isAvailable: true,
        status: "ONLINE_AVAILABLE",
        lastSeen: { $gt: staleCutoff },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [pickupLocation.lng, pickupLocation.lat]
                }
            }
        }
    };

    if (excludeRiderIds.length > 0) {
        query._id = { $nin: excludeRiderIds };
    }

    const riders = await Rider.find(query).limit(1);

    return riders.length > 0 ? riders[0] : null;
}

/**
 * Assigns a rider to an order atomically.
 * 
 * @param {string} orderId 
 * @param {Object} pickupLocation - { lat, lng }
 * @param {Object} rider - The rider document to assign
 * @returns {Promise<Object>} - The result object { success, rider, order, error }
 */
export async function assignRiderToOrder(orderId, pickupLocation, rider, io) {
    try {
        // Atomic update to ensure rider is still available
        const updatedRider = await Rider.findOneAndUpdate(
            {
                _id: rider._id,
                status: "ONLINE_AVAILABLE" // Double check status hasn't changed
            },
            { status: "ONLINE_BUSY", isAvailable: false },
            { new: true }
        );

        if (!updatedRider) {
            return { success: false, error: "RIDER_UNAVAILABLE" };
        }

        // Assign to order - ATOMIC CHECK: status must be READY_FOR_PICKUP
        // We generally only assign if it's not already assigned.
        const updatedOrder = await updateOrderStatus({
            orderId,
            fromStatusRaw: ORDER_STATUS.READY_FOR_PICKUP,
            toStatus: ORDER_STATUS.RIDER_ASSIGNED,
            actor: { role: "system", name: "matching_service" },
            source: "services.matching",
            io,
            preconditions: { riderId: { $exists: false } },
            set: {
                riderId: updatedRider._id,
                riderAssignedAt: new Date(),
                riderResponseStatus: "PENDING",
                riderAcceptedAt: null,
                riderRejectedAt: null,
                riderRejectionReason: "",
            },
        });

        if (!updatedOrder) {
            // Rollback rider status if order was already taken
            await Rider.findByIdAndUpdate(rider._id, { status: "ONLINE_AVAILABLE", isAvailable: true });
            return { success: false, error: "ORDER_ALREADY_ASSIGNED" };
        }

        await recordAssignment(updatedRider._id);
        return { success: true, rider: updatedRider, order: updatedOrder };

    } catch (err) {
        console.error("Error assigning rider to order:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Orchestrates the matching process with retries/fallback.
 * 
 * @param {string} orderId 
 * @param {Object} pickupLocation 
 * @param {number} attempt - Current attempt number (starts at 1)
 * @param {Array<string>} excludeRiderIds - List of riders to exclude (rejected or timed out)
 * @param {Object} io - Socket.io instance
 */
export async function matchOrder(orderId, pickupLocation, attempt = 1, excludeRiderIds = [], io, startedAt = Date.now()) {
    const acceptSeconds = await getRiderAcceptTimeoutSeconds(orderId);
    const RESPONSE_TIMEOUT_MS = Math.max(30, Number(acceptSeconds || 30)) * 1000;
    const TOTAL_RETRY_WINDOW_MS = 4 * 60 * 1000; // 4 minutes total
    const deadlineAt = startedAt + TOTAL_RETRY_WINDOW_MS;

    console.log(`Requesting match for Order ${orderId}, Attempt ${attempt}, Exclude:`, excludeRiderIds);

    if (Date.now() > deadlineAt) {
        console.log(`Retry window exceeded for Order ${orderId}. Cancelling.`);
        const order = await Order.findById(orderId);
        if (order && order.status !== ORDER_STATUS.CANCELLED) {
            try {
                await updateOrderStatus({
                    orderId,
                    fromStatusRaw: order.status,
                    toStatus: ORDER_STATUS.CANCELLED,
                    actor: { role: "system", name: "matching_service" },
                    source: "services.matching",
                    reason: "NO_RIDER_ACCEPTED",
                    io,
                });
            } catch (err) {
                console.error("Failed to cancel order after retry window:", err);
            }
        }
        if (io) io.to(`order:${orderId}`).emit("order:no_riders_available");
        return { success: false, error: "RETRY_WINDOW_EXCEEDED" };
    }

    if (io) io.to(`order:${orderId}`).emit("order:searching");

    try {
        const rider = await findNearestAvailableRider(pickupLocation, excludeRiderIds);

        if (!rider) {
            console.log(`No available riders found for Order ${orderId} on attempt ${attempt}.`);
            if (Date.now() + RESPONSE_TIMEOUT_MS <= deadlineAt) {
                setTimeout(() => {
                    matchOrder(orderId, pickupLocation, attempt + 1, excludeRiderIds, io, startedAt);
                }, RESPONSE_TIMEOUT_MS);
            } else {
                if (io) io.to(`order:${orderId}`).emit("order:no_riders_available");
            }
            return { success: false, error: "NO_RIDERS_AVAILABLE" };
        }

        const assignResult = await assignRiderToOrder(orderId, pickupLocation, rider, io);

        if (!assignResult.success) {
            // If rider unavailable or order taken, retry immediately
            // If RIDER_UNAVAILABLE, exclude this rider and retry
            if (assignResult.error === "RIDER_UNAVAILABLE") {
                return matchOrder(orderId, pickupLocation, attempt, [...excludeRiderIds, rider._id], io, startedAt);
            }
            return { success: false, error: assignResult.error }; // Generic error or order taken
        }

        // --- SUCCESSFUL ASSIGNMENT ---
        const { rider: assignedRider } = assignResult;
        console.log(`Assigned Rider ${assignedRider.name} to Order ${orderId}`);

        if (io) {
            const riderPayload = {
                _id: orderId,
                orderId,
                status: ORDER_STATUS.RIDER_ASSIGNED,
                title: "New Delivery Request",
                body: `Pickup at ${assignResult?.order?.pickup?.address || "pickup location"} • Earn KES ${Number(assignResult?.order?.deliveryFee || 0) || 0}`,
                pickupAddress: assignResult?.order?.pickup?.address || "Pickup location",
                estimatedEarnings: Number(assignResult?.order?.deliveryFee || 0) || 0,
                acceptBy: Date.now() + RESPONSE_TIMEOUT_MS,
            };
            io.to(`order:${orderId}`).emit("order:rider_assigned", {
                rider: {
                    id: assignedRider._id,
                    name: assignedRider.name,
                    location: assignedRider.location,
                    phone: assignedRider.phone
                }
            });
            io.emit(`rider:order:${assignedRider.userId}`, riderPayload);
            io.to(`rider:${assignedRider.userId}`).emit("rider:new_order", riderPayload);
            io.to(`rider:${assignedRider.userId}`).emit("delivery:request", riderPayload);
        }

        if (assignedRider.userId) {
            await sendNotification({
                recipientId: assignedRider.userId,
                recipientType: "RIDER",
                title: "New Delivery Request",
                body: `Pickup at ${assignResult?.order?.pickup?.address || "pickup location"} • Earn KES ${Number(assignResult?.order?.deliveryFee || 0) || 0}`,
                data: { orderId: String(orderId) },
                eventType: "NEW_DELIVERY_REQUEST",
                deepLink: "/rider/dashboard",
                orderId: String(orderId),
                type: "ALERT",
                category: "orderUpdates",
                io,
            });
        }

        // --- TIMEOUT / REJECTION HANDLER ---
        // We need to monitor if the rider accepts. 
        // This part is tricky in a stateless HTTP request. 
        // Typically, we set a timeout in memory or use a delayed job (Redis/Bull).
        // For this "level polish" request without Redis, we can use `setTimeout`.
        // WARNING: If server restarts, this timeout is lost.

        setTimeout(async () => {
            // Check if order is still 'assigned' (not 'picking_up' which means accepted)
            const checkOrder = await Order.findById(orderId);
            if (
                checkOrder &&
                checkOrder.status === ORDER_STATUS.RIDER_ASSIGNED &&
                checkOrder.riderId?.toString() === assignedRider._id.toString() &&
                checkOrder.riderResponseStatus !== "ACCEPTED"
            ) {
                console.log(`Rider ${assignedRider.name} timed out for Order ${orderId}. Reassigning...`);
                const launchMode = isRuakaLaunchModeEnabled();
                const fallbackStatus = launchMode ? ORDER_STATUS.PENDING_RIDER : ORDER_STATUS.READY_FOR_PICKUP;

                await updateOrderStatus({
                    orderId,
                    fromStatusRaw: checkOrder.status,
                    toStatus: fallbackStatus,
                    actor: { role: "system", name: "matching_service" },
                    source: "services.matching",
                    reason: "RIDER_TIMEOUT",
                    io,
                    preconditions: { riderId: assignedRider._id },
                    set: {
                        riderId: null,
                        riderResponseStatus: "PENDING",
                        riderAcceptedAt: null,
                        riderRejectedAt: null,
                        riderRejectionReason: "",
                    },
                });

                // 2. Set rider to available again (or maybe penalty?)
                // Assuming they just missed it, set available.
                await Rider.findByIdAndUpdate(assignedRider._id, { status: "ONLINE_AVAILABLE", isAvailable: true, currentOrders: 0 });

                // 3. Retry with exclusion
                // recursive call
                if (!launchMode) {
                    matchOrder(orderId, pickupLocation, attempt + 1, [...excludeRiderIds, assignedRider._id], io, startedAt);
                }
            }
        }, RESPONSE_TIMEOUT_MS);

        return { success: true, rider: assignedRider };

    } catch (err) {
        console.error("Match Order Error:", err);
        return { success: false, error: err.message };
    }
}

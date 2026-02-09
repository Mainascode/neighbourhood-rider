
import Rider from "../models/Rider.js";
import Order from "../models/Order.js";

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

    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    const query = {
        status: "ONLINE_AVAILABLE",
        lastSeen: { $gt: twoMinutesAgo },
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
export async function assignRiderToOrder(orderId, pickupLocation, rider) {
    try {
        // Atomic update to ensure rider is still available
        const updatedRider = await Rider.findOneAndUpdate(
            {
                _id: rider._id,
                status: "ONLINE_AVAILABLE" // Double check status hasn't changed
            },
            { status: "ONLINE_BUSY" },
            { new: true }
        );

        if (!updatedRider) {
            return { success: false, error: "RIDER_UNAVAILABLE" };
        }

        // Assign to order - ATOMIC CHECK: status must be 'pending' or 'pending_vendor'
        // We generally only assign if it's not already assigned.
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId, riderId: { $exists: false } }, // Ensure no rider is assigned
            {
                riderId: updatedRider._id, // Store Rider document ID
                status: "assigned",
                riderAssignedAt: new Date()
            },
            { new: true }
        );

        if (!updatedOrder) {
            // Rollback rider status if order was already taken
            await Rider.findByIdAndUpdate(rider._id, { status: "ONLINE_AVAILABLE" });
            return { success: false, error: "ORDER_ALREADY_ASSIGNED" };
        }

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
export async function matchOrder(orderId, pickupLocation, attempt = 1, excludeRiderIds = [], io) {
    const MAX_ATTEMPTS = 3;
    const RESPONSE_TIMEOUT_MS = 15000; // 15 seconds

    console.log(`Requesting match for Order ${orderId}, Attempt ${attempt}, Exclude:`, excludeRiderIds);

    if (attempt > MAX_ATTEMPTS) {
        console.log(`Max attempts reached for Order ${orderId}. No riders found.`);
        if (io) io.to(`order:${orderId}`).emit("order:no_riders_available");
        // Optionally update order status to 'cancelled' or 'manual_intervention'
        return { success: false, error: "MAX_ATTEMPTS_REACHED" };
    }

    if (io) io.to(`order:${orderId}`).emit("order:searching");

    try {
        const rider = await findNearestAvailableRider(pickupLocation, excludeRiderIds);

        if (!rider) {
            console.log(`No available riders found for Order ${orderId} on attempt ${attempt}.`);
            // Either retry immediately with same exclusions (unlikely to help unless someone comes online)
            // or fail. For now, we fail if 0 riders found.
            if (io) io.to(`order:${orderId}`).emit("order:no_riders_available");
            return { success: false, error: "NO_RIDERS_AVAILABLE" };
        }

        const assignResult = await assignRiderToOrder(orderId, pickupLocation, rider);

        if (!assignResult.success) {
            // If rider unavailable or order taken, retry immediately
            // If RIDER_UNAVAILABLE, exclude this rider and retry
            if (assignResult.error === "RIDER_UNAVAILABLE") {
                return matchOrder(orderId, pickupLocation, attempt, [...excludeRiderIds, rider._id], io);
            }
            return { success: false, error: assignResult.error }; // Generic error or order taken
        }

        // --- SUCCESSFUL ASSIGNMENT ---
        const { rider: assignedRider } = assignResult;
        console.log(`Assigned Rider ${assignedRider.name} to Order ${orderId}`);

        if (io) {
            io.to(`order:${orderId}`).emit("order:rider_assigned", {
                rider: {
                    id: assignedRider._id,
                    name: assignedRider.name,
                    location: assignedRider.location,
                    phone: assignedRider.phone
                }
            });
            // Also notify the rider specifically?
            // io.to(`rider:${assignedRider.userId}`).emit("rider:new_order", { orderId, pickupLocation }); 
            // (Assumes riders join room `rider:{userId}`)
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
            if (checkOrder && checkOrder.status === "assigned" && checkOrder.riderId.toString() === assignedRider._id.toString()) {
                console.log(`Rider ${assignedRider.name} timed out for Order ${orderId}. Reassigning...`);

                // 1. Unassign
                checkOrder.riderId = null;
                // Don't reset to pending here if we want to keep "searching" state, but logic needs pending?
                // assignRiderToOrder checks for { riderId: { $exists: false } }.
                // So we must clear riderId.
                await checkOrder.save();

                // 2. Set rider to available again (or maybe penalty?)
                // Assuming they just missed it, set available.
                await Rider.findByIdAndUpdate(assignedRider._id, { status: "ONLINE_AVAILABLE" });

                // 3. Retry with exclusion
                // recursive call
                matchOrder(orderId, pickupLocation, attempt + 1, [...excludeRiderIds, assignedRider._id], io);
            }
        }, RESPONSE_TIMEOUT_MS);

        return { success: true, rider: assignedRider };

    } catch (err) {
        console.error("Match Order Error:", err);
        return { success: false, error: err.message };
    }
}

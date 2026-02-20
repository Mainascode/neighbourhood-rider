import Rider from "../../models/Rider.js";
import { ok, fail } from "../../lib/response.js";

export default async function me(req, res) {
    if (req.method === "PATCH") {
        try {
            const { isAvailable } = req.body;
            const rider = await Rider.findOneAndUpdate(
                { userId: req.user._id },
                { isAvailable, ...(typeof isAvailable === "boolean" ? { status: isAvailable ? "ONLINE_AVAILABLE" : "OFFLINE" } : {}) },
                { new: true }
            );
            if (!rider) return fail(res, "Not a rider", 404);
            return ok(res, rider);
        } catch (err) {
            console.error(err);
            return fail(res, "Failed to update status", 500);
        }
    }

    try {
        const rider = await Rider.findOne({ userId: req.user._id || req.user.id });
        if (!rider) {
            return fail(res, "Not a rider", 404);
        }
        return ok(res, rider);
    } catch (err) {
        console.error(err);
        return fail(res, "Failed to fetch rider profile", 500);
    }
}

import Rider from "../../models/Rider.js";
import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";

function normalizePhone(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    return raw.replace(/[^\d+]/g, "");
}

export default async function me(req, res) {
    if (req.method === "PATCH") {
        try {
            const { isAvailable, phone, riderPicture } = req.body || {};
            const update = {
                ...(typeof isAvailable === "boolean" ? { isAvailable, status: isAvailable ? "ONLINE_AVAILABLE" : "OFFLINE" } : {}),
            };

            if (typeof phone === "string") {
                const normalizedPhone = normalizePhone(phone);
                if (!normalizedPhone) return fail(res, "Phone number is required", 400);
                update.phone = normalizedPhone;
                await User.findByIdAndUpdate(req.user._id, { phone: normalizedPhone });
            }

            if (typeof riderPicture === "string" && riderPicture.trim()) {
                update.riderPicture = riderPicture.trim();
            }

            const rider = await Rider.findOneAndUpdate(
                { userId: req.user._id },
                update,
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

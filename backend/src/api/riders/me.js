import Link from "../../models/Rider.js";
import Rider from "../../models/Rider.js";

export default async function me(req, res) {
    if (req.method === "PATCH") {
        try {
            const { isAvailable } = req.body;
            const rider = await Rider.findOneAndUpdate(
                { userId: req.user._id },
                { isAvailable },
                { new: true }
            );
            if (!rider) return res.status(404).json({ message: "Not a rider" });
            return res.json(rider);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to update status" });
        }
    }

    try {
        const rider = await Rider.findOne({ userId: req.user._id });
        if (!rider) {
            return res.status(404).json({ message: "Not a rider" });
        }
        res.json(rider);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch rider profile" });
    }
}


import mongoose from "mongoose";
import { matchOrder } from "../src/services/matching.js";
import Rider from "../src/models/Rider.js";
import Order from "../src/models/Order.js";
import User from "../src/models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27019/neighbourhoodrider"; // Try custom port

async function runVerification() {
    console.log("🚀 Starting verification...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Cleanup
        await Rider.deleteMany({ name: "TestMatchRider" });
        await Order.deleteMany({ "pickup.address": "Test Match Pickup" });

        // 2. Create Test Rider
        const testUser = await User.create({
            name: "TestMatchRider",
            email: `testmatch${Date.now()}@example.com`,
            password: "password123",
            role: "rider",
            phone: "0712345678"
        });

        const rider = await Rider.create({
            userId: testUser._id,
            name: "TestMatchRider",
            phone: "0712345678",
            status: "ONLINE_AVAILABLE",
            isAvailable: true,
            location: { type: "Point", coordinates: [36.8219, -1.2921] }, // Nairobi Center
            lastSeen: new Date(),
            vehicleType: "electric_motorcycle"
        });
        console.log(`✅ Created Rider: ${rider.name} (${rider._id})`);

        // 3. Create Test Order
        const order = await Order.create({
            userId: new mongoose.Types.ObjectId(), // Fake user
            pickup: {
                address: "Test Match Pickup",
                location: { type: "Point", coordinates: [36.8219, -1.2921] }
            },
            dropoff: {
                address: "Test Match Dropoff",
                location: { type: "Point", coordinates: [36.8250, -1.2950] }
            },
            status: "pending"
        });
        console.log(`✅ Created Order: ${order._id}`);

        // 4. Test Match Order
        console.log("🔄 Running matchOrder...");
        // Mock IO
        const mockIo = { to: () => ({ emit: (ev, data) => console.log(`   [Socket] ${ev}:`, data) }) };

        const result = await matchOrder(order._id, { lat: -1.2921, lng: 36.8219 }, 1, [], mockIo);

        if (result.success && result.rider._id.toString() === rider._id.toString()) {
            console.log("✅ Match Successful! Rider assigned.");
        } else {
            console.error("❌ Match Failed:", result);
            process.exit(1);
        }

        // Verify DB state
        const updatedOrder = await Order.findById(order._id);
        const updatedRider = await Rider.findById(rider._id);

        if (updatedOrder.status === "assigned" && updatedOrder.riderId.toString() === rider._id.toString()) {
            console.log("✅ Order DB State Verified: Assigned");
        } else {
            console.error("❌ Order DB State Mismatch:", updatedOrder);
        }

        if (updatedRider.status === "ONLINE_BUSY") {
            console.log("✅ Rider DB State Verified: ONLINE_BUSY");
        } else {
            console.error("❌ Rider DB State Mismatch:", updatedRider.status);
        }

        // 5. Test Exclusion / Rejection Logic
        console.log("🔄 Testing Rejection Logic (Simulated)...");

        // Manually reset for test
        await Order.findByIdAndUpdate(order._id, { riderId: null, status: "pending" });
        await Rider.findByIdAndUpdate(rider._id, { status: "ONLINE_AVAILABLE" });

        // Try match with exclusion
        const resultExcluded = await matchOrder(order._id, { lat: -1.2921, lng: 36.8219 }, 1, [rider._id], mockIo);

        if (!resultExcluded.success && resultExcluded.error === "NO_RIDERS_AVAILABLE") {
            console.log("✅ Exclusion Tested: No riders found (as expected since only 1 rider exists)");
        } else {
            console.error("❌ Exclusion Test Failed. Result:", resultExcluded);
        }

        console.log("🎉 Verification Complete!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Verification Error:", err);
        process.exit(1);
    }
}

runVerification();

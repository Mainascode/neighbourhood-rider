
import mongoose from "mongoose";
import Vendor from "../src/models/Vendor.js";
import User from "../src/models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/neighbourhoodrider";

async function runVerification() {
    console.log("🚀 Starting Vendor Hours Verification...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Fetch a Vendor (or create one)
        let vendor = await Vendor.findOne();
        if (!vendor) {
            console.log("⚠️ No vendor found, creating dummy...");
            const user = await User.findOne({ role: "vendor" }) || await User.create({ name: "VendorTest", email: "v@test.com", role: "vendor", phone: "0700000000" });
            vendor = await Vendor.create({
                userId: user._id,
                storeName: "Test Store",
                phone: "0700000000",
                location: { type: "Point", coordinates: [36.8, -1.2] },
                status: "approved"
            });
        }

        // 2. Check Virtuals
        const now = new Date();
        const headers = ["Property", "Value"];
        const rows = [];

        rows.push(["Current Time", now.toLocaleTimeString()]);
        rows.push(["isOpen", vendor.isOpen]);
        rows.push(["availabilityState", vendor.availabilityState]);
        rows.push(["nextOpenTime", vendor.nextOpenTime]);

        console.table(rows);

        // 3. Logic Validation
        const currentHour = now.getHours();
        const expectedOpen = currentHour >= 6 && currentHour < 21;

        if (vendor.isOpen === expectedOpen) {
            console.log(`✅ Virtual 'isOpen' is correct (${vendor.isOpen}) for hour ${currentHour}`);
        } else {
            console.error(`❌ Virtual 'isOpen' mismatch! Expected ${expectedOpen}, got ${vendor.isOpen}`);
        }

        // 4. Test Order Validation Logic (Simulation)
        console.log("\n🔄 Simulating Order Time Validation...");
        if (expectedOpen) {
            console.log("   -> System is OPEN. Order creation should SUCCEED.");
        } else {
            console.log("   -> System is CLOSED. Order creation should FAIL with 400.");
        }

        process.exit(0);

    } catch (err) {
        console.error("❌ Verification Error:", err);
        process.exit(1);
    }
}

runVerification();

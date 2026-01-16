import dotenv from "dotenv";
dotenv.config({ path: "backend/.env.local" });

import { connectDB } from "./src/lib/db.js";
import Order from "./src/models/Order.js";
import Vendor from "./src/models/Vendor.js";
import User from "./src/models/User.js";
import Rider from "./src/models/Rider.js";
import mongoose from "mongoose";

// MOCK Push Notification
const consoleLogPush = (userId, title, body) => {
    console.log(`\n📲 PUSH NOTIFICATION to [${userId}]:\n   Title: ${title}\n   Body: ${body}\n`);
};

async function simulate() {
    await connectDB();
    console.log("🚀 Starting Simulation...\n");

    // 1. Setup Data
    const user = await User.findOne({ role: "user" }) || await User.create({ name: "Test User", email: "test@user.com", role: "user", phone: "0712345678" });
    const riderUser = await User.findOne({ role: "rider" }) || await User.create({ name: "Test Rider", email: "rider@test.com", role: "rider", phone: "0798765432" });
    let rider = await Rider.findOne({ userId: riderUser._id });
    if (!rider) rider = await Rider.create({ userId: riderUser._id, name: riderUser.name, phone: riderUser.phone, status: "approved", isOnline: true });

    let vendor = await Vendor.findOne();
    if (!vendor) vendor = await Vendor.create({ userId: user._id, storeName: "Sim Shop", phone: "0700000000", mpesaType: "till", mpesaNumber: "123456" });

    // 2. CREATE ORDER
    console.log("--- STEP 1: USER PLACES ORDER ---");
    const order = await Order.create({
        userId: user._id,
        items: [{ name: "Milk", price: 100 }],
        total: 150,
        goodsTotal: 100,
        deliveryFee: 50,
        isDeliveryFeePaid: true, // Simulate paid fee
        status: "pending",
        completionOtp: "1234",
        pickup: { location: { coordinates: [36.8, -1.2] } },
        dropoff: { location: { coordinates: [36.9, -1.3] } },
        vendorId: vendor._id
    });
    console.log(`✅ Order Created: ${order._id}`);
    consoleLogPush("ADMIN", "New Order!", "User placed order #...");

    // 3. RIDER ASSIGNMENT (Simulate Admin/Bot)
    console.log("\n--- STEP 2: RIDER ASSIGNMENT ---");
    order.status = "assigned";
    order.riderId = rider._id;
    await order.save();
    console.log("✅ Order Assigned to Rider");
    consoleLogPush(rider.userId, "New Order Assigned! 🔔", "Pickup at Sim Shop");

    // 4. RIDER ACCEPTS
    console.log("\n--- STEP 3: RIDER ACCEPTS (GO TO SHOP) ---");
    order.status = "picking_up";
    await order.save();
    console.log("✅ Rider Accepted -> Status: picking_up");
    consoleLogPush(user._id, "Rider Accepted Your Order! 🏍️", `${rider.name} is heading to the shop. Please pay the vendor directly.`);

    // 5. PICKUP CONFIRMATION
    console.log("\n--- STEP 4: VENDOR PAYMENT & PICKUP ---");
    console.log(`ℹ️ User sees: Pay KES ${order.goodsTotal} to ${vendor.mpesaType} ${vendor.mpesaNumber}`);
    order.status = "delivering";
    order.goodsPaid = true;
    await order.save();
    console.log("✅ Rider Confirmed Pickup -> Status: delivering");
    consoleLogPush(user._id, "Order Picked Up! 🛍️", "Rider has collected your items and is on the way!");

    // 6. DELIVERY & OTP
    console.log("\n--- STEP 5: DELIVERY & OTP ---");
    console.log(`ℹ️ User shares OTP: ${order.completionOtp}`);
    const inputOtp = "1234"; // Correct OTP
    if (inputOtp === order.completionOtp) {
        order.status = "completed";
        order.paid = true;
        await order.save();
        console.log("✅ Order Completed successfully!");
        consoleLogPush(user._id, "Order Delivered! 🎉", "Your order has been delivered using OTP verification.");
    } else {
        console.log("❌ OTP Verification Failed");
    }

    console.log("\n🎉 SIMULATION COMPLETE");
    process.exit();
}

simulate();

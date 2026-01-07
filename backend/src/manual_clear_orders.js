import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";

dotenv.config();

async function clearOrders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");

        const result = await Order.deleteMany({});
        console.log(`🗑️ Deleted ${result.deletedCount} orders.`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

clearOrders();

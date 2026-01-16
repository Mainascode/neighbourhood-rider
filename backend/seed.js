import mongoose from "mongoose";
import User from "./src/models/User.js";
import Rider from "./src/models/Rider.js";
import Vendor from "./src/models/Vendor.js";

// Hardcode URI for local seeding ease
const MONGO_URI = "mongodb://127.0.0.1:27017/neighbourhoodrider";

async function seed() {
    console.log("🌱 Starting Seeding Process...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. TEST USER
        let user = await User.findOne({ email: "user@test.com" });
        if (!user) {
            user = await User.create({
                name: "Test Customer",
                email: "user@test.com",
                password: "password123", // In a real app this should be hashed, assuming model hashes on save
                phone: "0712345678",
                role: "user"
            });
            console.log("✅ Created Test User");
        } else {
            console.log("ℹ️ Test User already exists");
        }

        // 2. TEST RIDER
        let riderUser = await User.findOne({ email: "rider@test.com" });
        if (!riderUser) {
            riderUser = await User.create({
                name: "Test Rider",
                email: "rider@test.com",
                password: "password123",
                phone: "0798765432",
                role: "rider"
            });
            // Create Rider Profile
            await Rider.create({
                userId: riderUser._id,
                name: riderUser.name,
                phone: riderUser.phone,
                idNumber: "12345678",
                numberPlate: "KMEA 123J",
                items: ["Helmet", "Reflector"],
                status: "approved",
                isOnline: true, // Online by default for testing
                verification: {
                    idUrl: "http://example.com/id.jpg",
                    licenseUrl: "http://example.com/license.jpg"
                }
            });
            console.log("✅ Created Test Rider (Online & Approved)");
        } else {
            console.log("ℹ️ Test Rider already exists");
        }

        // 3. TEST VENDOR
        let vendorUser = await User.findOne({ email: "vendor@test.com" });
        if (!vendorUser) {
            vendorUser = await User.create({
                name: "Test Vendor Owner",
                email: "vendor@test.com",
                password: "password123",
                phone: "0700112233",
                role: "vendor" // Assuming you have this role, if not 'user' is fine but 'vendor' allows dashboard access
            });
        }

        let vendor = await Vendor.findOne({ storeName: "Mama Mboga Deluxe" });
        if (!vendor) {
            await Vendor.create({
                userId: vendorUser._id,
                storeName: "Mama Mboga Deluxe",
                phone: "0722000000",
                address: "Market St, Stall 42",
                location: { type: "Point", coordinates: [36.8, -1.2] }, // Nairobi Area
                isOpen: true,
                mpesaType: "pochi",
                mpesaNumber: "0722000000",
                inventory: [
                    { name: "Fresh Kales (Sukuma)", price: 50, inStock: true },
                    { name: "Tomatoes (1kg)", price: 120, inStock: true },
                    { name: "Onions (Net)", price: 80, inStock: true }
                ]
            });
            console.log("✅ Created Test Vendor (Pochi la Biashara)");
        } else {
            console.log("ℹ️ Test Vendor already exists");
        }

        // 4. TEST VENDOR 2 (Till Number)
        let vendor2 = await Vendor.findOne({ storeName: "City Butchers" });
        if (!vendor2) {
            await Vendor.create({
                userId: vendorUser._id, // Same owner for simplicity
                storeName: "City Butchers",
                phone: "0733000000",
                address: "High Street",
                location: { type: "Point", coordinates: [36.81, -1.21] },
                isOpen: true,
                mpesaType: "till",
                mpesaNumber: "567890",
                inventory: [
                    { name: "Beef (1kg)", price: 600, inStock: true },
                    { name: "Goat Meat", price: 750, inStock: true }
                ]
            });
            console.log("✅ Created Test Vendor 2 (Buy Goods Till)");
        }

        console.log("\n---------------------------------------------------");
        console.log("🧪 SEED DATA READY FOR TESTING");
        console.log("---------------------------------------------------");
        console.log(`👤 Customer: user@test.com / password123`);
        console.log(`🏍️ Rider:    rider@test.com / password123`);
        console.log(`🏪 Vendor 1: Mama Mboga (Pochi: 0722000000)`);
        console.log(`🏪 Vendor 2: City Butchers (Till: 567890)`);
        console.log("---------------------------------------------------");

        process.exit();

    } catch (e) {
        console.error("❌ Seeding Failed:", e);
        process.exit(1);
    }
}

seed();

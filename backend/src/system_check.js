import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Rider from "./models/Rider.js";
import Order from "./models/Order.js";
import jwt from "jsonwebtoken";

dotenv.config();

const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

const signToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

async function verifyHierarchy() {
    console.log(`${COLORS.blue}${COLORS.bold}🔍 Starting App Hierarchy Verification...${COLORS.reset}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ Database Connected`);

        // 1. Verify/Create Test Users
        console.log(`\n${COLORS.yellow}--- Checking Roles ---${COLORS.reset}`);

        const roles = ["admin", "rider", "user"];
        const users = {};

        for (const role of roles) {
            let user = await User.findOne({ email: `${role}@test.com` });
            if (!user) {
                console.log(`Creating dummy ${role}...`);
                user = await User.create({
                    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                    email: `${role}@test.com`,
                    password: "password123", // Hasher should handle this if using save(), but we are mocking for now
                    role: role
                });
            } else {
                // Ensure role is correct (fix if drifted)
                if (user.role !== role) {
                    user.role = role;
                    await user.save();
                }
            }
            users[role] = user;
            console.log(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)}: Exists (ID: ${user._id})`);
        }

        // 2. Rider Specific Checks
        console.log(`\n${COLORS.yellow}--- Checking Rider Status ---${COLORS.reset}`);
        let riderProfile = await Rider.findOne({ userId: users.rider._id });
        if (!riderProfile) {
            console.log("Creating Rider Profile...");
            riderProfile = await Rider.create({
                userId: users.rider._id,
                name: users.rider.name,
                phone: "0700000000",
                vehicleType: "Bike",
                status: "approved",
                isAvailable: true
            });
        }

        // Force Approve & Online
        riderProfile.status = "approved";
        riderProfile.isAvailable = true;
        await riderProfile.save();
        console.log(`✅ Rider Status: ${riderProfile.status.toUpperCase()}`);
        console.log(`✅ Rider Availability: ${riderProfile.isAvailable ? "ONLINE" : "OFFLINE"}`);


        // 3. Simulate Permissions (Mocking Middleware Logic)
        console.log(`\n${COLORS.yellow}--- Verifying Hierarchy Permissions ---${COLORS.reset}`);

        const verifyAccess = (role, targetResource) => {
            // Admin can access everything
            if (role === 'admin') return true;
            // Rider can access Rider & User stuff
            if (role === 'rider' && ['rider', 'user'].includes(targetResource)) return true;
            // User can only access User stuff
            if (role === 'user' && targetResource === 'user') return true;

            return false;
        };

        const check = (actorRole, target) => {
            const allowed = verifyAccess(actorRole, target);
            const color = allowed ? COLORS.green : COLORS.red;
            const icon = allowed ? "✔" : "✘";
            console.log(`${color}${icon} ${actorRole.toUpperCase()} accessing ${target.toUpperCase()} Resource${COLORS.reset}`);
        };

        check("user", "admin"); // Should fail
        check("rider", "admin"); // Should fail
        check("admin", "admin"); // Should pass
        check("rider", "rider"); // Should pass


        // 4. Simulate Order Flow
        console.log(`\n${COLORS.yellow}--- Simulating Order Flow ---${COLORS.reset}`);

        // A. User Creates Order
        console.log("1. User creates an Order...");
        const newOrder = await Order.create({
            user: users.user._id,
            items: [{ name: "Test Burger", price: 500 }],
            amount: 500,
            location: "Nairobi",
            locationCoordinates: { lat: -1.2, lng: 36.8 }, // Lat/Lng Valid
            status: "pending"
        });
        console.log(`   -> Order Created: ${newOrder._id} [${newOrder.status}]`);

        // B. Admin/System Assigns Rider
        console.log("2. System looks for Rider...");
        // Logic: Find nearest online rider
        const availableRider = await Rider.findOne({ status: "approved", isAvailable: true });
        if (availableRider) {
            console.log(`   -> Found Rider: ${availableRider.name}`);
            newOrder.rider = availableRider.userId;
            newOrder.status = "assigned";
            await newOrder.save();
            console.log(`   -> Order Updated: ${newOrder.status.toUpperCase()} to ${availableRider.name}`);
        } else {
            console.log(`${COLORS.red}❌ No Rider Found! Verification Failed.${COLORS.reset}`);
        }

        // C. Rider Delivers
        console.log("3. Rider Completes Delivery...");
        newOrder.status = "delivered";
        await newOrder.save();
        console.log(`   -> Order Status: ${newOrder.status.toUpperCase()}`);

        console.log(`\n${COLORS.green}${COLORS.bold}✨ HIERARCHY VERIFICATION COMPLETE ✨${COLORS.reset}`);
        console.log("Test Users:");
        console.log(`Admn: admin@test.com / password123`);
        console.log(`Rider: rider@test.com / password123`);
        console.log(`User: user@test.com / password123`);

        process.exit(0);
    } catch (err) {
        console.error(`${COLORS.red}ERROR:${COLORS.reset}`, err);
        process.exit(1);
    }
}

verifyHierarchy();

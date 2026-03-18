import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Rider from "./models/Rider.js";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const setupTestRider = async () => {
    await connectDB();

    // Find or Create User
    const email = "smurkcarter855@gmail.com";
    let user = await User.findOne({ email });

    if (!user) {
        console.log("User not found... Creating new User.");
        user = new User({
            name: "Test Rider",
            email,
            role: "rider",
        });
    }

    // Reset Password
    const bcrypt = (await import("bcryptjs")).default;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash("password", salt);
    user.role = "rider"; // Force role
    await user.save();
    console.log("✅ User Password reset to 'password'");

    console.log("User found:", user.name, user._id);

    // Find or Create Rider Profile
    let rider = await Rider.findOne({ userId: user._id });
    if (!rider) {
        console.log("Creating Rider Profile...");
        rider = new Rider({
            userId: user._id,
            name: user.name,
            phone: "0700000000", // Dummy phone
            status: "approved",
            isAvailable: true,
            location: {
                type: "Point",
                coordinates: [36.8219, -1.2921] // Nairobi CBD
            }
        });
    } else {
        console.log("Updating existing Rider Profile...");
        rider.status = "approved";
        rider.isAvailable = true;
        rider.location = {
            type: "Point",
            coordinates: [36.8219, -1.2921] // Nairobi CBD
        };
    }

    await rider.save();
    console.log("✅ Rider is now APPROVED, ONLINE, and located in Nairobi CBD.");
    process.exit(0);
};

setupTestRider();

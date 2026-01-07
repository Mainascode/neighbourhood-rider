
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Rider from './models/Rider.js';

dotenv.config();

const riders = [
    {
        name: "Juma Kamau",
        email: "juma.rider@gmail.com",
        phone: "0711000001",
        location: [-1.2675, 36.8000], // Westlands
        area: "Westlands"
    },
    {
        name: "Ben Njoroge",
        email: "ben.rider@gmail.com",
        phone: "0711000002",
        location: [-1.2833, 36.7833], // Kileleshwa
        area: "Kileleshwa"
    },
    {
        name: "Kevin Ochieng",
        email: "kevin.rider@gmail.com",
        phone: "0711000003",
        location: [-1.2921, 36.8219], // CBD
        area: "CBD"
    },
    {
        name: "Sarah Wanjiku",
        email: "sarah.rider@gmail.com",
        phone: "0711000004",
        location: [-1.3000, 36.7600], // Kilimani/Ngong Rd
        area: "Kilimani"
    }
];

const seedRiders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Password for all riders
        const hashedPassword = await bcrypt.hash("password123", 10);

        for (const r of riders) {
            // 1. Check if user exists
            let user = await User.findOne({ email: r.email });
            if (!user) {
                user = await User.create({
                    name: r.name,
                    email: r.email,
                    password: hashedPassword,
                    role: "rider"
                });
                console.log(`Created User: ${r.name}`);
            } else {
                // Ensure role is rider
                user.role = "rider";
                await user.save();
                console.log(`Found User: ${r.name}`);
            }

            // 2. Create/Update Rider Profile
            await Rider.findOneAndUpdate(
                { userId: user._id },
                {
                    name: r.name,
                    phone: r.phone,
                    status: "approved",
                    isAvailable: true,
                    idNumber: "12345678",
                    // Default placeholder images
                    idPicture: "https://via.placeholder.com/300?text=ID+Card",
                    riderPicture: "https://via.placeholder.com/300?text=Rider+Selfie",
                    location: {
                        type: "Point",
                        coordinates: [r.location[1], r.location[0]] // GeoJSON is [Lng, Lat]
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`✅ Rider ${r.name} is Ready (Location: ${r.area})`);
        }

        console.log('🎉 Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding riders:', error);
        process.exit(1);
    }
};

seedRiders();

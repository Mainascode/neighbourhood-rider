
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Vendor from './models/Vendor.js';

dotenv.config();

const seedVendor = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/neighbourhoodrider";
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log(`✅ Connected to MongoDB at ${uri}`);

        // 1. Create/Update User
        const email = 'vendor@test.com';
        const hashedPassword = await bcrypt.hash("password123", 10);

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name: 'Test Vendor Owner',
                email,
                password: hashedPassword,
                role: 'vendor', // Important: Set role to vendor
                phone: '0700000000'
            });
            console.log('✅ Vendor User Created');
        } else {
            user.role = 'vendor';
            user.password = hashedPassword;
            await user.save();
            console.log('✅ Vendor User Updated');
        }

        // 2. Create/Update Vendor Profile
        const vendorData = {
            userId: user._id,
            storeName: "Neighbourhood Supermarket",
            description: "Your one-stop shop for daily essentials, fresh produce, and household items.",
            logo: "https://placehold.co/400x400/F97316/ffffff?text=NS", // Orange placeholder
            coverImage: "https://placehold.co/1200x400/1F2937/ffffff?text=Store+Cover",
            phone: "0712345678",
            location: {
                type: "Point",
                coordinates: [36.8219, -1.2921], // Nairobi
                address: "Kenyatta Avenue, Nairobi"
            },
            address: "Kenyatta Avenue, Nairobi",
            isOpen: true,
            status: 'approved', // Auto-approve for testing
            rating: 4.8,
            deliveryTime: "15-30 min",
            inventory: [
                { name: "Fresh Milk 500ml", price: 65, image: "https://placehold.co/200x200?text=Milk", inStock: true },
                { name: "Bread 400g", price: 80, image: "https://placehold.co/200x200?text=Bread", inStock: true },
                { name: "Tray of Eggs (30pcs)", price: 450, image: "https://placehold.co/200x200?text=Eggs", inStock: true },
                { name: "Cooking Oil 1L", price: 300, image: "https://placehold.co/200x200?text=Oil", inStock: true },
                { name: "Maize Flour 2kg", price: 230, image: "https://placehold.co/200x200?text=Unga", inStock: true }
            ]
        };

        const vendor = await Vendor.findOneAndUpdate(
            { userId: user._id },
            vendorData,
            { upsert: true, new: true }
        );

        console.log(`✅ Vendor Profile '${vendor.storeName}' created/updated successfully.`);
        console.log(`---------------------------------------------------`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: password123`);
        console.log(`---------------------------------------------------`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding vendor:', error);
        process.exit(1);
    }
};

seedVendor();

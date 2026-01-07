import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'user.nr@gmail.com';
        const hashedPassword = await bcrypt.hash("password123", 10);

        const user = await User.findOneAndUpdate(
            { email },
            {
                name: 'Test User',
                email,
                password: hashedPassword,
                role: 'user'
            },
            { upsert: true, new: true }
        );

        console.log(`✅ User ${user.email} created/updated successfully.`);
        console.log(`Password: password123`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();

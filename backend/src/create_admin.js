
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'admin.nr@gmail.com';
        const password = 'adminpassword123'; // Default temporary password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.findOneAndUpdate(
            { email },
            {
                name: 'Henry Kimani (Admin)',
                email,
                password: hashedPassword,
                role: 'admin'
            },
            { upsert: true, new: true }
        );

        console.log(`Admin user ${user.email} created/updated successfully.`);
        console.log(`Password: ${password}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();

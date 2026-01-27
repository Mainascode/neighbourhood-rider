import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Ensure a user has a wallet
export const ensureWallet = async (userId, role) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, role });
    }
    return wallet;
};

// Process a Transaction
export const processTransaction = async ({ userId, role, type, amount, description, referenceId, metadata }) => {
    const wallet = await ensureWallet(userId, role);

    // Create Transaction Record
    const transaction = await Transaction.create({
        walletId: wallet._id,
        type,
        amount,
        status: "completed",
        description,
        referenceId,
        metadata
    });

    // Update Wallet Balance
    if (type === "deposit" || type === "earning") {
        wallet.balance += amount;
    } else if (type === "withdrawal" || type === "commission_deduction" || type === "service_fee") {
        // Check balance for withdrawals
        if (type === 'withdrawal' && wallet.balance < amount) {
            throw new Error("Insufficient funds");
        }
        wallet.balance -= amount;
    }

    await wallet.save();
    return { wallet, transaction };
};


export const getAdminWallet = async () => {
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
        return null;
    }
    return ensureWallet(admin._id, "admin");
};

// Distribute Order Funds
export const distributeOrderFunds = async (order) => {
    // Expect order.distribution to be present
    const { vendorPayout, riderPayout, adminRevenue } = order.distribution || {};

    if (vendorPayout === undefined) {
        console.error("Order missing distribution data.");
        return;
    }

    // 1. Credit Vendor
    if (order.vendorId) {
        const Vendor = mongoose.model("Vendor");
        const vendorProfile = await Vendor.findById(order.vendorId);
        if (vendorProfile) {
            await processTransaction({
                userId: vendorProfile.userId,
                role: "vendor",
                type: "earning",
                amount: vendorPayout,
                description: `Order Payout #${order._id}`,
                referenceId: order._id.toString()
            });
        }
    }

    // 2. Credit Rider
    if (order.riderId) {
        const Rider = mongoose.model("Rider");
        const riderProfile = await Rider.findById(order.riderId);
        if (riderProfile) {
            await processTransaction({
                userId: riderProfile.userId,
                role: "rider",
                type: "earning",
                amount: riderPayout,
                description: `Delivery Payout #${order._id}`,
                referenceId: order._id.toString()
            });
        }
    }

    // 3. Credit Admin
    const adminWallet = await getAdminWallet();
    if (adminWallet) {
        await processTransaction({
            userId: adminWallet.userId,
            role: "admin",
            type: "earning",
            amount: adminRevenue,
            description: `Commission & Fees #${order._id}`,
            referenceId: order._id.toString()
        });
    }
};

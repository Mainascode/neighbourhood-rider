import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Ensure a user has a wallet
export const ensureWallet = async (userId, role) => {
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
        console.log(`[Wallet] Creating new wallet for user ${userId} with role ${role}`);
        wallet = await Wallet.create({ userId, role });
    } else if (wallet.role !== role) {
        console.log(`[Wallet] Updating wallet role for user ${userId} from ${wallet.role} to ${role}`);
        wallet.role = role;
        await wallet.save();
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
        status: metadata?.status || "completed", // Allow overriding status
        description,
        referenceId,
        metadata
    });

    // Update Wallet Balance
    if (metadata?.status === "pending") {
        wallet.pendingBalance += amount;
    } else {
        if (type === "deposit" || type === "earning") {
            wallet.balance += amount;
        } else if (type === "withdrawal" || type === "commission_deduction" || type === "service_fee" || type === "purchase") {
            // Check balance for withdrawals
            if (type === 'withdrawal' && wallet.balance < amount) {
                throw new Error("Insufficient funds");
            }
            wallet.balance -= amount;
        }
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
    const { vendorPayout, vendorGross, vendorCommission, riderPayout, adminRevenue } = order.distribution || {};

    if (vendorPayout === undefined) {
        console.error("Order missing distribution data.");
        return;
    }

    // 1. Credit Vendor
    if (order.vendorId) {
        const Vendor = mongoose.model("Vendor");
        const vendorProfile = await Vendor.findById(order.vendorId);
        if (vendorProfile) {
            // A. Credit Gross Earning
            const grossAmount = vendorGross || vendorPayout; // Fallback for old orders
            await processTransaction({
                userId: vendorProfile.userId,
                role: "vendor",
                type: "earning",
                amount: grossAmount,
                description: `Order Revenue #${order._id}`,
                referenceId: order._id.toString(),
                metadata: { status: "pending" }
            });

            // B. Deduct Commission (if applicable)
            if (vendorCommission && vendorCommission > 0) {
                await processTransaction({
                    userId: vendorProfile.userId,
                    role: "vendor",
                    type: "commission_deduction",
                    amount: vendorCommission,
                    description: `Platform Commission #${order._id}`,
                    referenceId: order._id.toString(),
                    metadata: { status: "pending" }
                });
            }
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
                referenceId: order._id.toString(),
                metadata: { status: "pending" }
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
            referenceId: order._id.toString(),
            metadata: { status: "pending" }
        });
    }
};

// Release Pending Funds for an Order
export const releasePendingFunds = async (orderId) => {
    // Find all pending transactions for this order
    const transactions = await Transaction.find({
        referenceId: orderId.toString(),
        status: "pending"
    });

    if (transactions.length === 0) {
        console.log(`[Wallet] No pending funds to release for order ${orderId}`);
        return;
    }

    for (const trx of transactions) {
        const wallet = await Wallet.findById(trx.walletId);
        if (wallet) {
            // Move from Pending to Available
            if (wallet.pendingBalance >= trx.amount) {
                wallet.pendingBalance -= trx.amount;
            } else {
                // Safety net: if pending balance is somehow less (shouldn't happen), reset to 0
                wallet.pendingBalance = 0;
            }
            wallet.balance += trx.amount;
            await wallet.save();

            // Mark Transaction as Completed
            trx.status = "completed";
            await trx.save();

            console.log(`[Wallet] Released KES ${trx.amount} for wallet ${wallet._id} (Order ${orderId})`);
        }
    }
};

// Refund Order (Cancel pending transactions and Credit User)
export const refundOrder = async (order, reason) => {
    // 1. Void Pending Transactions (Vendor, Rider, Admin)
    const transactions = await Transaction.find({
        referenceId: order._id.toString(),
        status: "pending"
    });

    for (const trx of transactions) {
        const wallet = await Wallet.findById(trx.walletId);
        if (wallet) {
            // Remove from pending balance
            if (wallet.pendingBalance >= trx.amount) {
                wallet.pendingBalance -= trx.amount;
            } else {
                wallet.pendingBalance = 0;
            }
            await wallet.save();

            trx.status = "cancelled";
            await trx.save();
            console.log(`[Wallet] Cancelled pending transaction ${trx._id} for wallet ${wallet._id}`);
        }
    }

    // 2. Credit User Wallet (Full Refund)
    if (order.paid || order.isDeliveryFeePaid) {
        let refundAmount = 0;
        if (order.paid) refundAmount = order.amount;
        else if (order.isDeliveryFeePaid) refundAmount = order.deliveryFee;

        if (refundAmount > 0) {
            await processTransaction({
                userId: order.userId,
                role: "user",
                type: "deposit",
                amount: refundAmount,
                description: `Refund for Order #${order._id} (${reason})`,
                referenceId: order._id.toString(),
                metadata: { status: "completed", reason }
            });
            console.log(`[Wallet] Refunded KES ${refundAmount} to User ${order.userId}`);
        }
    }
};

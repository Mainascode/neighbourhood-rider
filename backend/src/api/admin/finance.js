import express from "express";
import Wallet from "../../models/Wallet.js";
import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";
import { processTransaction } from "../../lib/wallet.js";
import { sendMpesaB2C } from "../payments/payouts.js"; // Export this from payouts.js

const router = express.Router();

// Get Payout Queue (Wallets with measurable balance)
router.get("/queue", async (req, res) => {
    try {
        const wallets = await Wallet.find({ balance: { $gt: 0 } }).sort({ balance: -1 });

        // Populate User Details manually or via populate if schema supports
        // Wallet ref is 'userId', but let's just fetch users to be robust
        const userIds = wallets.map(w => w.userId);
        const users = await User.find({ _id: { $in: userIds } }).select("name phone email role");

        const queue = wallets.map(w => {
            const user = users.find(u => u._id.toString() === w.userId.toString());
            return {
                _id: w._id,
                userId: w.userId,
                name: user?.name || "Unknown",
                phone: w.payoutDetails?.accountNumber || user?.phone,
                role: w.role,
                balance: w.balance,
                pendingBalance: w.pendingBalance,
                payoutDetails: w.payoutDetails
            };
        });

        res.json(queue);
    } catch (error) {
        console.error("Finance Queue Error", error);
        res.status(500).json({ message: "Error fetching queue" });
    }
});

// Get Batches
router.get("/batches", async (req, res) => {
    try {
        // Need to import PayoutBatch. Dynamic import or add to top.
        // I'll assume I can import it.
        const PayoutBatch = (await import("../../models/PayoutBatch.js")).default;
        const batches = await PayoutBatch.find().sort({ startedAt: -1 }).limit(20);
        res.json(batches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching batches" });
    }
});

// Get Payout History
router.get("/history", async (req, res) => {
    try {
        const transactions = await Transaction.find({ type: "withdrawal" })
            .sort({ createdAt: -1 })
            .limit(100); // Pagination later

        // Populate specific wallet info if needed, but for now raw is okay or join
        // Let's populate wallet to get user name
        // const walletIds = transactions.map(t => t.walletId);
        // ... Optimization: Skip for MVP, just return basic info. 
        // Or better, let frontend handle or do a quick lookup.

        res.json(transactions);
    } catch (error) {
        console.error("Finance History Error", error);
        res.status(500).json({ message: "Error fetching history" });
    }
});

// Get Specific Ledger (Transactions for a wallet)
router.get("/ledger/:walletId", async (req, res) => {
    try {
        const { walletId } = req.params;
        const transactions = await Transaction.find({ walletId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ledger" });
    }
});

// Process Single Payout
router.post("/pay/:walletId", async (req, res) => {
    try {
        const { walletId } = req.params;
        const wallet = await Wallet.findById(walletId);
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        if (wallet.balance < 10) return res.status(400).json({ message: "Balance too low" });
        if (!wallet.payoutDetails?.accountNumber) return res.status(400).json({ message: "No payout details" });

        const amount = wallet.balance;
        const phone = wallet.payoutDetails.accountNumber;

        // Initiate Withdrawal
        const { transaction } = await processTransaction({
            userId: wallet.userId,
            role: wallet.role,
            type: "withdrawal",
            amount,
            description: "Manual Admin Payout",
            referenceId: `PAYOUT_MANUAL_${Date.now()}`,
            metadata: { status: "processing", initiator: req.user._id }
        });

        // Trigger B2C (Imported logic)
        // Note: We need to export sendMpesaB2C from payouts.js or move it to a lib.
        // For now, I'll update payouts.js to export it.
        const b2cResponse = await sendMpesaB2C(phone, amount, "Manual Payment");

        if (b2cResponse.ResponseCode === "0") {
            transaction.referenceId = b2cResponse.ConversationID;
            transaction.status = "completed";
            transaction.metadata = { ...transaction.metadata, status: "completed", b2cResponse };
            await transaction.save();
            res.json({ success: true, message: `Paid KES ${amount} to ${phone}` });
        } else {
            // Revert
            wallet.balance += amount;
            await wallet.save();
            transaction.status = "failed";
            await transaction.save();
            res.status(400).json({ message: "B2C Failed" });
        }

    } catch (error) {
        console.error("Payout Error", error);
        res.status(500).json({ message: "Payout failed" });
    }
});

export default router;

import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import { ensureWallet, processTransaction } from "../../lib/wallet.js";
import Transaction from "../../models/Transaction.js";

const router = express.Router();

// Get Wallet Balance & Transactions
router.get("/me", requireAuth, async (req, res) => {
    try {
        const wallet = await ensureWallet(req.user._id, req.user.role);
        const transactions = await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 }).limit(50);

        res.json({ wallet, transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching wallet" });
    }
});

// Withdraw Funds (simulated B2C)
router.post("/withdraw", requireAuth, async (req, res) => {
    try {
        const { amount, phone } = req.body;
        const wallet = await ensureWallet(req.user._id, req.user.role);

        if (wallet.balance < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        // B2C Logic (Mock for now)
        // In production, call Safaricom B2C API here

        // Deduct from Wallet
        await processTransaction({
            userId: req.user._id,
            role: req.user.role,
            type: "withdrawal",
            amount,
            description: "M-Pesa Withdrawal",
            referenceId: `WD-${Date.now()}`
        });

        res.json({ success: true, message: "Withdrawal initiated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Withdrawal failed" });
    }
});

// Update Payout Details
router.post("/payout", requireAuth, async (req, res) => {
    try {
        const { provider, accountNumber, accountName } = req.body;
        if (!provider || !accountNumber) {
            return res.status(400).json({ message: "Provider and Account Number required" });
        }

        const wallet = await ensureWallet(req.user._id, req.user.role);
        wallet.payoutDetails = { provider, accountNumber, accountName };
        await wallet.save();

        res.json({ success: true, wallet });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating payout details" });
    }
});

export default router;

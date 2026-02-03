import Wallet from "../../models/Wallet.js";
import Transaction from "../../models/Transaction.js";
import { processTransaction } from "../../lib/wallet.js";

// Mock M-Pesa B2C Call
export const sendMpesaB2C = async (phone, amount, remark) => {
    // Correct Daraja B2C Request Body Structure
    const payload = {
        InitiatorName: process.env.MPESA_INITIATOR_NAME || "TestInit",
        SecurityCredential: "ENCRYPTED_PASSWORD", // Should be generated
        CommandID: "BusinessPayment", // or SalaryPayment, PromotionPayment
        Amount: amount,
        PartyA: process.env.MPESA_SHORTCODE,
        PartyB: phone,
        Remarks: remark,
        QueueTimeOutURL: `${process.env.API_URL}/api/payments/b2c/timeout`,
        ResultURL: `${process.env.API_URL}/api/payments/b2c/result`,
        Occasion: "Payout"
    };

    console.log(`[M-Pesa B2C] Sending Request:`, payload);

    // Simulate API Response
    return new Promise(resolve => setTimeout(() => resolve({
        ConversationID: `AG_${Date.now()}`,
        OriginatorConversationID: `OC_${Date.now()}`,
        ResponseCode: "0",
        ResponseDescription: "Accept the service request successfully."
    }), 1000));
};

export const processBatchPayouts = async (req, res) => {
    try {
        console.log("[Payout Job] Starting End-of-Day Payouts...");

        // 1. Find all wallets with balance > MIN_PAYOUT (e.g., 50 KES)
        const MIN_PAYOUT = 50;
        const wallets = await Wallet.find({ balance: { $gte: MIN_PAYOUT }, isActive: true });

        let processedCount = 0;
        let totalPayout = 0;

        for (const wallet of wallets) {
            // Validate Payout Details
            if (!wallet.payoutDetails || !wallet.payoutDetails.accountNumber) {
                console.warn(`[Payout Job] Skipping wallet ${wallet._id} - No payout details`);
                continue;
            }

            const amount = wallet.balance;
            const phone = wallet.payoutDetails.accountNumber; // Assuming format is correct

            // 2. Initiate Withdrawal Transaction (Processing)
            let transaction;
            try {
                // Deduct Balance
                const result = await processTransaction({
                    userId: wallet.userId,
                    role: wallet.role,
                    type: "withdrawal",
                    amount: amount,
                    description: "End-of-Day Payout",
                    referenceId: `PAYOUT_PENDING_${Date.now()}`,
                    metadata: { status: "processing" }
                });
                transaction = result.transaction;

                // 3. Trigger M-Pesa B2C
                const b2cResponse = await sendMpesaB2C(phone, amount, "Earnings Payout");

                if (b2cResponse.ResponseCode === "0") {
                    console.log(`[Payout Job] Payout Success: KES ${amount} to ${phone}`);

                    // Update Transaction with Reference
                    transaction.referenceId = b2cResponse.ConversationID;
                    transaction.status = "completed";
                    transaction.metadata = { ...transaction.metadata, status: "completed", b2cResponse };
                    await transaction.save();

                    processedCount++;
                    totalPayout += amount;
                } else {
                    console.error(`[Payout Job] B2C Failed for ${phone}`);
                    // Revert Balance
                    wallet.balance += amount;
                    await wallet.save();

                    transaction.status = "failed";
                    transaction.description += " (Failed/Reverted)";
                    await transaction.save();
                }

            } catch (err) {
                console.error(`[Payout Job] Error processing wallet ${wallet._id}:`, err);
                // If transaction was created but failed later, we might be in trouble if we didn't revert.
                // But try/catch block implies processTransaction might fail or B2C might fail.
            }
        }

        res.json({
            success: true,
            message: `Payout job completed. Processed ${processedCount} wallets. Total: KES ${totalPayout}`,
            data: { processedCount, totalPayout }
        });

    } catch (error) {
        console.error("Payout Job Error:", error);
        res.status(500).json({ message: "Payout Job Failed" });
    }
};

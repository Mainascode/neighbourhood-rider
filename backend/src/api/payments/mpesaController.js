
import axios from 'axios';
import Order from '../../models/Order.js';

const getMpesaToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    // In production change URL to https://api.safaricom.co.ke/...

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Mpesa Token Error:", error.response?.data || error.message);
        throw new Error("Failed to get Mpesa Token");
    }
};

export const initiateSTKPush = async (req, res) => {
    try {
        const { phoneNumber, amount, orderId } = req.body;

        if (!phoneNumber || !amount || !orderId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const token = await getMpesaToken();
        const date = new Date();
        const timestamp = date.getFullYear() +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            ("0" + date.getDate()).slice(-2) +
            ("0" + date.getHours()).slice(-2) +
            ("0" + date.getMinutes()).slice(-2) +
            ("0" + date.getSeconds()).slice(-2);

        const shortCode = process.env.MPESA_SHORTCODE; // Paybill or Till
        const passkey = process.env.MPESA_PASSKEY;
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

        const stkUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        const callbackUrl = `${process.env.API_URL}/api/payments/mpesa/callback`;

        const data = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline", // or CustomerBuyGoodsOnline
            Amount: Math.floor(amount), // Ensure integer
            PartyA: phoneNumber, // Start with 254
            PartyB: shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: callbackUrl,
            AccountReference: `Order ${orderId}`,
            TransactionDesc: "Payment for Delivery"
        };

        const response = await axios.post(stkUrl, data, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(200).json({ success: true, message: "STK Push Initiated", data: response.data });

    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "STK Push Failed", error: error.message });
    }
};

export const handleMpesaCallback = async (req, res) => {
    try {
        const { Body } = req.body;

        if (Body.stkCallback.ResultCode === 0) {
            // Success
            const metadata = Body.stkCallback.CallbackMetadata.Item;
            const amount = metadata.find(o => o.Name === 'Amount').Value;
            const mpesaReceiptNumber = metadata.find(o => o.Name === 'MpesaReceiptNumber').Value;

            console.log(`[M-Pesa] Payment Successful: ${mpesaReceiptNumber} - KES ${amount}`);

            // Update Order
            // Find order by checkout ID
            const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
            const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestId });

            if (order) {
                // Determine what exactly was paid for
                // If amount matches 'amount' (Total), then full payment
                // If matches 'deliveryFee', then only delivery fee
                // Ideally, we should have a flag or logic. For MVP, assuming if order.paid is false and amount matches total, it's full payment.

                // NOTE: The previous flow seemed to separate goods vs delivery fee. 
                // The prompt says "User Payment... User pays via M-Pesa STK Push... All credits start as pending".
                // This implies a single payment flow for the MVP or handling both.

                // Let's assume this handles the main full payment or delivery fee payment based on context. 
                // Checks:
                if (Math.abs(order.amount - amount) < 10) {
                    order.paid = true;
                    order.goodsPaid = true;
                    order.isDeliveryFeePaid = true;
                    order.status = 'assigned'; // Ready for rider assignment if not already
                } else if (Math.abs(order.deliveryFee - amount) < 10) {
                    order.isDeliveryFeePaid = true;
                }

                order.paymentData = {
                    mpesaReceiptNumber,
                    amount,
                    phoneNumber: metadata.find(o => o.Name === 'PhoneNumber')?.Value,
                    date: new Date()
                };

                await order.save();

                // DISTRIBUTE FUNDS (Pending)
                // Import dynamically to avoid circular dependency issues if any, or just import at top if safe.
                // We'll import at top.
                const { distributeOrderFunds } = await import("../../lib/wallet.js");
                await distributeOrderFunds(order);

                console.log(`[M-Pesa] Funds distributed (pending) for order ${order._id}`);

                // Real-time notification socket?
                // const io = req.app.get("io");
                // if(io) io.emit... 
            } else {
                console.error(`[M-Pesa] Order not found for CheckoutID: ${checkoutRequestId}`);
            }

        } else {
            console.log(`[M-Pesa] Payment Failed/Cancelled: ${Body.stkCallback.ResultDesc}`);
        }

        res.status(200).json({ message: "Callback received" });
    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).json({ message: "Error processing callback" });
    }
};

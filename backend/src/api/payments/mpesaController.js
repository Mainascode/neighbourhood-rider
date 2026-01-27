
import axios from 'axios';
import { Order } from '../../models/Order.js';

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
            const phoneNumber = metadata.find(o => o.Name === 'PhoneNumber').Value;

            // Find Order logic here needed? Or we can't link easily without AccountReference passed back (not always reliable in callback body directly without DB mapping).
            // Actually, we usually save the CheckoutRequestID to the specific order when initiating, so we can look it up now.

            console.log(`Payment Successful: ${mpesaReceiptNumber} - ${amount}`);

            // TODO: Update Order status in DB
            // const order = await Order.findOne({ mpesaCheckoutRequestId: Body.stkCallback.CheckoutRequestID });
            // if(order) {
            //    order.isDeliveryFeePaid = true;
            //    order.paymentData = req.body;
            //    await order.save();
            // }

        } else {
            console.log("Payment Failed/Cancelled");
        }

        res.status(200).json({ message: "Callback received" });
    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).json({ message: "Error processing callback" });
    }
};

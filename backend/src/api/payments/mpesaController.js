
import axios from 'axios';
import crypto from "crypto";
import Order from '../../models/Order.js';
import MpesaTransaction from "../../models/MpesaTransaction.js";
import { sendNotification } from "../../lib/notificationService.js";
import { updateOrderStatus, normalizeOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

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
        const user = req.user;

        if (!phoneNumber || !amount || !orderId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.userId?.toString() !== user._id?.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const amt = Number(amount);
        const matchesTotal = Math.abs(order.amount - amt) < 10;
        const matchesDelivery = Math.abs(order.deliveryFee - amt) < 10;
        if (!matchesTotal && !matchesDelivery) {
            return res.status(400).json({ message: "Invalid payment amount" });
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

        const checkoutRequestId = response.data.CheckoutRequestID;
        if (checkoutRequestId) {
            await Order.findByIdAndUpdate(orderId, {
                mpesaCheckoutRequestId: checkoutRequestId,
                paymentData: {
                    ...(order.paymentData || {}),
                    checkoutRequestId,
                    phoneNumber,
                    amount: amt,
                    initiatedAt: new Date()
                }
            });
        }

        res.status(200).json({ success: true, message: "STK Push Initiated", data: response.data });

    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "STK Push Failed", error: error.message });
    }
};

export const handleMpesaCallback = async (req, res) => {
    try {
        const signature = req.headers["x-mpesa-signature"];
        const secret = process.env.MPESA_CALLBACK_SECRET;
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

        if (!signature || !secret) {
            return res.status(401).json({ message: "Missing signature or secret" });
        }

        const expected = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

        if (signature !== expected) {
            return res.status(403).json({ message: "Invalid signature" });
        }

        const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf-8")) : req.body;
        const { Body } = parsedBody;
        if (!Body?.stkCallback) {
            return res.status(400).json({ message: "Invalid callback payload" });
        }

        const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
        const resultCode = Body.stkCallback.ResultCode;
        const resultDesc = Body.stkCallback.ResultDesc;

        // Record callback and enforce idempotency
        const existingTx = await MpesaTransaction.findOne({ checkoutRequestId });
        if (existingTx?.processedAt) {
            return res.status(200).json({ message: "Callback already processed" });
        }

        if (resultCode === 0) {
            // Success
            const metadata = Body.stkCallback.CallbackMetadata?.Item || [];
            const amount = metadata.find(o => o.Name === 'Amount')?.Value;
            const mpesaReceiptNumber = metadata.find(o => o.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = metadata.find(o => o.Name === 'PhoneNumber')?.Value;

            console.log(`[M-Pesa] Payment Successful: ${mpesaReceiptNumber} - KES ${amount}`);

            // Update Order
            // Find order by checkout ID
            const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestId });

            if (order) {
                const amt = Number(amount);
                const matchesTotal = Math.abs(order.amount - amt) < 10;
                const matchesDelivery = Math.abs(order.deliveryFee - amt) < 10;
                if (!matchesTotal && !matchesDelivery) {
                    await MpesaTransaction.findOneAndUpdate(
                        { checkoutRequestId },
                        {
                            checkoutRequestId,
                            mpesaReceiptNumber,
                            orderId: order._id,
                            amount: amt,
                            phoneNumber,
                            resultCode,
                            resultDesc,
                            raw: Body,
                            processedAt: new Date(),
                            sourceIp: req.ip
                        },
                        { upsert: true, new: true }
                    );
                    return res.status(200).json({ message: "Amount mismatch recorded" });
                }

                // Determine what exactly was paid for
                // If amount matches 'amount' (Total), then full payment
                // If matches 'deliveryFee', then only delivery fee
                // Ideally, we should have a flag or logic. For MVP, assuming if order.paid is false and amount matches total, it's full payment.

                // NOTE: The previous flow seemed to separate goods vs delivery fee. 
                // The prompt says "User Payment... User pays via M-Pesa STK Push... All credits start as pending".
                // This implies a single payment flow for the MVP or handling both.

                // Let's assume this handles the main full payment or delivery fee payment based on context. 
                // Checks:
                const setUpdates = {};
                if (Math.abs(order.amount - amount) < 10) {
                    setUpdates.paid = true;
                    setUpdates.goodsPaid = true;
                    setUpdates.isDeliveryFeePaid = true;
                } else if (Math.abs(order.deliveryFee - amount) < 10) {
                    setUpdates.isDeliveryFeePaid = true;
                }

                setUpdates.paymentData = {
                    mpesaReceiptNumber,
                    amount: amt,
                    phoneNumber,
                    date: new Date()
                };

                const currentStatus = normalizeOrderStatus(order.status);
                if (currentStatus !== ORDER_STATUS.PAYMENT_CONFIRMED) {
                    await updateOrderStatus({
                        orderId: order._id,
                        fromStatusRaw: order.status,
                        toStatus: ORDER_STATUS.PAYMENT_CONFIRMED,
                        actor: { role: "system", name: "mpesa_callback" },
                        source: "payments.mpesa_callback",
                        io: req.app.get("io"),
                        set: setUpdates,
                        preconditions: { mpesaCheckoutRequestId: checkoutRequestId }
                    });
                } else {
                    Object.assign(order, setUpdates);
                    await order.save();
                }

                // DISTRIBUTE FUNDS (Pending)
                // Import dynamically to avoid circular dependency issues if any, or just import at top if safe.
                // We'll import at top.
                const { distributeOrderFunds } = await import("../../lib/wallet.js");
                await distributeOrderFunds(order);

                console.log(`[M-Pesa] Funds distributed (pending) for order ${order._id}`);

                // Update Status to pending_vendor if it was payment_pending
                if (normalizeOrderStatus(order.status) === ORDER_STATUS.PAYMENT_CONFIRMED) {

                    // NOTIFY VENDOR
                    const io = req.app.get("io");
                    if (order.vendorId) {
                        const Vendor = (await import("../../models/Vendor.js")).default;
                        const vendorProfile = await Vendor.findById(order.vendorId);

                        if (vendorProfile && io) {
                            io.to(`vendor:${vendorProfile.userId}`).emit("vendor:order:new", order);
                        }
                        if (vendorProfile?.userId) {
                            await sendNotification({
                                recipientId: vendorProfile.userId,
                                recipientType: "VENDOR",
                                title: "New paid order received",
                                body: `New order received. Order #${order._id.slice(-6)}.`,
                                data: { orderId: String(order._id) },
                                eventType: "NEW_PAID_ORDER",
                                deepLink: "/vendor/dashboard",
                                orderId: String(order._id),
                                type: "ALERT",
                                category: "orderUpdates",
                                io,
                            });
                        }
                    }
                }

                // Real-time notification socket for User
                const io = req.app.get("io");
                if (io) io.to(`order:${order._id}`).emit("order:update", order);

            } else {
                console.error(`[M-Pesa] Order not found for CheckoutID: ${checkoutRequestId}`);
            }

            await MpesaTransaction.findOneAndUpdate(
                { checkoutRequestId },
                {
                    checkoutRequestId,
                    mpesaReceiptNumber,
                    orderId: order?._id,
                    amount: Number(amount),
                    phoneNumber,
                    resultCode,
                    resultDesc,
                    raw: Body,
                    processedAt: new Date(),
                    sourceIp: req.ip
                },
                { upsert: true, new: true }
            );
        } else {
            console.log(`[M-Pesa] Payment Failed/Cancelled: ${resultDesc}`);
            const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestId });
            if (order) {
                const currentStatus = normalizeOrderStatus(order.status);
                if (currentStatus !== ORDER_STATUS.CANCELLED) {
                    await updateOrderStatus({
                        orderId: order._id,
                        fromStatusRaw: order.status,
                        toStatus: ORDER_STATUS.CANCELLED,
                        actor: { role: "system", name: "mpesa_callback" },
                        source: "payments.mpesa_callback",
                        reason: "PAYMENT_FAILED",
                        io: req.app.get("io"),
                    });
                } else {
                    await order.save();
                }

                // Notify User via Socket
                const io = req.app.get("io");
                if (io) io.to(`order:${order._id}`).emit("order:update", order);
            }
            await MpesaTransaction.findOneAndUpdate(
                { checkoutRequestId },
                {
                    checkoutRequestId,
                    orderId: order?._id,
                    resultCode,
                    resultDesc,
                    raw: Body,
                    processedAt: new Date(),
                    sourceIp: req.ip
                },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({ message: "Callback received" });
    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).json({ message: "Error processing callback" });
    }
};


import axios from 'axios';
import crypto from "crypto";
import Order from '../../models/Order.js';
import MpesaTransaction from "../../models/MpesaTransaction.js";
import PaymentEventLog from "../../models/PaymentEventLog.js";
import { sendNotification } from "../../lib/notificationService.js";
import { updateOrderStatus, normalizeOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

function getMpesaBaseUrl() {
    return process.env.NODE_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
}

function parseAllowedCallbackIps() {
    return String(process.env.MPESA_CALLBACK_IPS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function normalizeSourceIp(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const candidate = forwarded || req.ip || "";
    return candidate.replace(/^::ffff:/, "");
}

function shouldEnforceCallbackSignature() {
    return String(process.env.MPESA_ENFORCE_SIGNATURE || "false").toLowerCase() === "true";
}

function isLiveHttpsUrl(urlValue) {
    try {
        const parsed = new URL(String(urlValue || ""));
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        if (host === "localhost" || host === "127.0.0.1") return false;
        if (host.endsWith(".local")) return false;
        if (host.includes("example.com")) return false;
        return true;
    } catch {
        return false;
    }
}

const getMpesaToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const url = `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

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

        const stkUrl = `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`;
        const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.API_URL}/api/payments/mpesa/callback`;
        if (process.env.NODE_ENV === "production" && !isLiveHttpsUrl(callbackUrl)) {
            return res.status(500).json({
                success: false,
                message: "MPESA_CALLBACK_URL must be a live HTTPS endpoint in production.",
            });
        }

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
        const merchantRequestId = response.data.MerchantRequestID;
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
            await MpesaTransaction.findOneAndUpdate(
                { checkoutRequestId },
                {
                    checkoutRequestId,
                    merchantRequestId,
                    orderId: order._id,
                    amount: amt,
                    phoneNumber,
                    status: "INITIATED",
                    initiatedAt: new Date(),
                    initiationRaw: response.data,
                },
                { upsert: true, new: true }
            );
            await PaymentEventLog.create({
                eventType: "STK_INIT_SUCCESS",
                checkoutRequestId,
                orderId: order._id,
                resultDesc: "STK push initiated",
                raw: response.data,
            }).catch(() => { });
        }

        res.status(200).json({ success: true, message: "STK Push Initiated", data: response.data });

    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        await PaymentEventLog.create({
            eventType: "STK_INIT_FAILED",
            orderId: req.body?.orderId || undefined,
            resultDesc: error.response?.data?.errorMessage || error.message,
            raw: {
                request: {
                    phoneNumber: req.body?.phoneNumber,
                    amount: req.body?.amount,
                    orderId: req.body?.orderId,
                },
                response: error.response?.data,
            },
        }).catch((logErr) => {
            console.error("Payment event log failed:", logErr.message);
        });
        res.status(500).json({ success: false, message: "STK Push Failed" });
    }
};

export const handleMpesaCallback = async (req, res) => {
    try {
        const allowedIps = parseAllowedCallbackIps();
        const sourceIp = normalizeSourceIp(req);
        if (allowedIps.length && !allowedIps.includes(sourceIp)) {
            await PaymentEventLog.create({
                eventType: "CALLBACK_AUTH_FAILED",
                sourceIp,
                resultDesc: "IP not allowlisted",
                raw: { headers: req.headers },
            }).catch(() => { });
            return res.status(403).json({ message: "IP not allowed" });
        }

        const signature = req.headers["x-mpesa-signature"];
        const secret = process.env.MPESA_CALLBACK_SECRET;
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

        // Daraja callbacks are typically secured via source IP allowlist.
        // Signature validation is optional and can be enforced with MPESA_ENFORCE_SIGNATURE=true.
        if (secret && signature) {
            const expected = crypto
                .createHmac("sha256", secret)
                .update(rawBody)
                .digest("hex");
            if (signature !== expected) {
                await PaymentEventLog.create({
                    eventType: "CALLBACK_AUTH_FAILED",
                    sourceIp,
                    resultDesc: "Invalid callback signature",
                    raw: { headers: req.headers },
                }).catch(() => { });
                return res.status(403).json({ message: "Invalid signature" });
            }
        } else if (shouldEnforceCallbackSignature()) {
            await PaymentEventLog.create({
                eventType: "CALLBACK_AUTH_FAILED",
                sourceIp,
                resultDesc: "Signature required but missing",
                raw: { headers: req.headers },
            }).catch(() => { });
            return res.status(401).json({ message: "Missing signature or secret" });
        }

        const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf-8")) : req.body;
        const { Body } = parsedBody;
        if (!Body?.stkCallback) {
            return res.status(400).json({ message: "Invalid callback payload" });
        }

        const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
        const resultCode = Body.stkCallback.ResultCode;
        const resultDesc = Body.stkCallback.ResultDesc;
        const merchantRequestId = Body.stkCallback.MerchantRequestID;

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
                            sourceIp
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
                if ([ORDER_STATUS.CREATED, ORDER_STATUS.PAYMENT_PENDING].includes(currentStatus)) {
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
                    merchantRequestId,
                    mpesaReceiptNumber,
                    orderId: order?._id,
                    amount: Number(amount),
                    phoneNumber,
                    status: "SUCCESS",
                    resultCode,
                    resultDesc,
                    raw: Body,
                    callbackReceivedAt: new Date(),
                    processedAt: new Date(),
                    sourceIp
                },
                { upsert: true, new: true }
            );
        } else {
            console.log(`[M-Pesa] Payment Failed/Cancelled: ${resultDesc}`);
            const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestId });
            await PaymentEventLog.create({
                eventType: "CALLBACK_PAYMENT_FAILED",
                checkoutRequestId,
                orderId: order?._id,
                resultCode,
                resultDesc,
                sourceIp,
                raw: Body,
            }).catch((logErr) => {
                console.error("Payment event log failed:", logErr.message);
            });
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
                    merchantRequestId,
                    orderId: order?._id,
                    status: "FAILED",
                    resultCode,
                    resultDesc,
                    raw: Body,
                    callbackReceivedAt: new Date(),
                    processedAt: new Date(),
                    sourceIp
                },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({ message: "Callback received" });
    } catch (error) {
        console.error("Callback Error:", error);
        let parsedBody = {};
        try {
            parsedBody = Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString("utf-8"))
                : (req.body || {});
        } catch {
            parsedBody = { rawBody: "<unparseable>" };
        }
        const callbackBody = parsedBody?.Body?.stkCallback;
        const checkoutRequestId = callbackBody?.CheckoutRequestID;
        const sourceIp = normalizeSourceIp(req);
        await PaymentEventLog.findOneAndUpdate(
            { eventType: "CALLBACK_FAILED", checkoutRequestId: checkoutRequestId || null },
            {
                $set: {
                    checkoutRequestId,
                    sourceIp,
                    lastError: error.message,
                    raw: parsedBody,
                },
                $inc: { attempts: 1 },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).catch((logErr) => {
            console.error("Callback failure log failed:", logErr.message);
        });
        // Return 500 to let upstream webhook sender retry.
        res.status(500).json({ message: "Error processing callback" });
    }
};

export const getMpesaTransactionStatus = async (req, res) => {
    try {
        const checkoutRequestId = String(req.params.checkoutRequestId || "").trim();
        if (!checkoutRequestId) {
            return res.status(400).json({ message: "checkoutRequestId is required" });
        }

        const tx = await MpesaTransaction.findOne({ checkoutRequestId }).lean();
        if (!tx) return res.status(404).json({ message: "Transaction not found" });

        return res.status(200).json({
            checkoutRequestId: tx.checkoutRequestId,
            merchantRequestId: tx.merchantRequestId || null,
            orderId: tx.orderId || null,
            status: tx.status || "INITIATED",
            resultCode: tx.resultCode ?? null,
            resultDesc: tx.resultDesc || null,
            mpesaReceiptNumber: tx.mpesaReceiptNumber || null,
            amount: tx.amount ?? null,
            phoneNumber: tx.phoneNumber || null,
            initiatedAt: tx.initiatedAt || null,
            callbackReceivedAt: tx.callbackReceivedAt || null,
            processedAt: tx.processedAt || null,
            sourceIp: tx.sourceIp || null,
        });
    } catch (err) {
        console.error("Get M-Pesa transaction status error:", err);
        return res.status(500).json({ message: "Failed to fetch transaction status" });
    }
};

import connectDB from "../../../../lib/db.js";
import Product from "../../../../models/Product.js";
import Order from "../../../../models/Order.js";
import Payment from "../../../../models/Payment.js";
import User from "../../../../models/User.js";
import { requireApiUser } from "../../../../lib/api-auth.js";
import { SERVICE_AREAS } from "../../../../lib/constants.js";
import { ensureSystemSettings } from "../../../../lib/bootstrap.js";
import { calculateDeliveryFee } from "../../../../lib/delivery.js";
import { initiateMpesaStkPush } from "../../../../lib/mpesa.js";
import { fail, ok } from "../../../../lib/response.js";

export async function POST(request) {
  const user = await requireApiUser();
  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  const { items = [], customerName, customerPhone, area, address } = body;

  if (!items.length) {
    return fail("Add at least one item to cart.");
  }

  if (!String(customerName || "").trim() || !String(customerPhone || "").trim() || !String(address || "").trim()) {
    return fail("Customer name, phone, and address are required.");
  }

  if (!SERVICE_AREAS.includes(area)) {
    return fail("Area outside service scope.");
  }

  await connectDB();
  const [dbUser, settings] = await Promise.all([
    User.findById(user.id),
    ensureSystemSettings(),
  ]);

  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) }, isActive: true }).lean();
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  let normalizedItems;

  try {
    normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Missing product ${item.productId}`);
      }

      const quantity = Math.max(1, Number(item.quantity || 1));

      return {
        productId: product._id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        subtotal: product.price * quantity,
      };
    });
  } catch {
    return fail("One or more cart items are no longer available.", 400);
  }

  const itemsTotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryMeta = calculateDeliveryFee({
    weather: settings.weather,
    freeDelivery: dbUser.freeDeliveryCredits > 0,
  });

  const order = await Order.create({
    userId: dbUser._id,
    items: normalizedItems,
    customerName: String(customerName).trim(),
    customerPhone: String(customerPhone).trim(),
    area,
    address: String(address).trim(),
    itemsTotal,
    deliveryFee: deliveryMeta.fee,
    totalPrice: itemsTotal + deliveryMeta.fee,
    weather: deliveryMeta.weather,
    deliveryWindow: deliveryMeta.timeWindow,
    freeDeliveryApplied: deliveryMeta.isFreeDelivery,
    paymentStatus: "pending",
  });

  const stk = await initiateMpesaStkPush({
    phone: customerPhone,
    amount: order.totalPrice,
    accountReference: `NR-${order._id.toString().slice(-6)}`,
    transactionDesc: "Neighbourhood Rider order payment",
  });

  const payment = await Payment.create({
    orderId: order._id,
    phone: stk.phone || customerPhone,
    amount: order.totalPrice,
    status: stk.isMock ? "paid" : stk.ok ? "initiated" : "failed",
    mpesaRef: stk.CheckoutRequestID || "",
    merchantRequestId: stk.MerchantRequestID || "",
    checkoutRequestId: stk.CheckoutRequestID || "",
    payload: stk,
  });

  order.mpesaCheckoutRequestId = payment.checkoutRequestId;
  order.paymentStatus = payment.status;

  if (payment.status === "paid") {
    order.paidAt = new Date();
    if (order.freeDeliveryApplied && dbUser.freeDeliveryCredits > 0) {
      dbUser.freeDeliveryCredits -= 1;
      order.referralCreditConsumed = true;
    }
    await dbUser.save();
  }

  await order.save();

  return ok({
    message: stk.isMock
      ? "Order paid in mock mode because M-PESA credentials are not configured."
      : "STK Push sent. Complete payment on your phone to confirm the order.",
    order: {
      id: order._id.toString(),
      deliveryFee: order.deliveryFee,
      weather: order.weather,
      paymentStatus: order.paymentStatus,
    },
    payment: {
      id: payment._id.toString(),
      checkoutRequestId: payment.checkoutRequestId,
      receiptNumber: payment.receiptNumber,
      status: payment.status,
    },
  }, { status: 201 });
}

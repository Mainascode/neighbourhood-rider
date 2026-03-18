import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: { type: [OrderItemSchema], default: [] },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "purchased", "on_delivery", "delivered", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "initiated", "paid", "failed"],
    default: "pending",
  },
  paidAt: { type: Date },
  deliveredAt: { type: Date },
  itemsTotal: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  weather: { type: String, enum: ["sunny", "rainy"], default: "sunny" },
  deliveryWindow: { type: String, default: "daytime" },
  freeDeliveryApplied: { type: Boolean, default: false },
  referralCreditConsumed: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ["mpesa"], default: "mpesa" },
  mpesaCheckoutRequestId: { type: String },
  paymentData: { type: Object, default: {} },
}, { timestamps: true });

OrderSchema.index({ mpesaCheckoutRequestId: 1 }, { sparse: true });

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

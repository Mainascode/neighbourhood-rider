import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pickup: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: [Number]
    }
  },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  dropoff: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: [Number]
    }
  },
  items: [],
  status: {
    type: String,
    enum: ["pending", "pending_vendor", "preparing", "ready_for_pickup", "assigned", "picking_up", "delivering", "delivered", "completed", "cancelled", "payment_pending", "payment_failed"],
    default: "pending",
  },
  vendorCancelReason: {
    type: String,
    enum: ["OUT_OF_STOCK", "TOO_BUSY", "STORE_CLOSED", "SYSTEM_ERROR"],
  },
  paid: { type: Boolean, default: false }, // Overall Payment (legacy / rider)
  goodsPaid: { type: Boolean, default: false }, // Vendor Payment Status
  amount: { type: Number, default: 0 }, // Total Amount (Goods + Fee)
  goodsTotal: { type: Number, default: 0 }, // Cost of Items
  deliveryFee: { type: Number, default: 50 }, // Rider Fee (Fixed 50)
  isDeliveryFeePaid: { type: Boolean, default: false }, // Delivery Fee Payment Status
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
  isBotOrder: { type: Boolean, default: false },
  isReviewed: { type: Boolean, default: false },
  isReceived: { type: Boolean, default: false }, // User confirmed receipt
  completionOtp: { type: String }, // OTP to verify delivery (Legacy/Optional)
  mpesaCheckoutRequestId: { type: String }, // For tracking Mpesa STK Push
  paymentMethod: { type: String, enum: ['mpesa', 'cash', 'google_pay'], default: 'cash' },
  paymentData: { type: Object }, // Store full callback data

  // Scheduling
  scheduledFor: { type: Date }, // If set, order is for future
  isScheduled: { type: Boolean, default: false },

  // Detailed Pricing Breakdown
  pricing: {
    goodsTotal: Number,
    deliveryFee: Number, // The fee charged to customer
    serviceFee: Number,  // KES 30
    totalCost: Number
  },

  // Calculated Splits
  distribution: {
    vendorPayout: Number,
    riderPayout: Number,
    adminRevenue: Number,
    splits: Object
  }
}, { timestamps: true });

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

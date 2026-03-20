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
  finalItems: { type: Array, default: [] },
  customerNote: { type: String, default: "" },
  status: {
    type: String,
    enum: ["DRAFT", "AWAITING_CONFIRMATION", "PAID", "SHOPPING", "DELIVERING", "DELIVERED", "CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PROCESSING", "ON_THE_WAY", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "PENDING_RIDER", "RIDER_ASSIGNED", "CANCELLED", "REFUNDED"],
    default: "CREATED",
  },
  vendorCancelReason: {
    type: String,
    enum: ["OUT_OF_STOCK", "TOO_BUSY", "STORE_CLOSED", "SYSTEM_ERROR"],
  },
  paid: { type: Boolean, default: false }, // Overall Payment (legacy / rider)
  goodsPaid: { type: Boolean, default: false }, // Vendor Payment Status
  amount: { type: Number, default: 0 },
  goodsTotal: { type: Number, default: 0 },
  estimatedTotal: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  isDeliveryFeePaid: { type: Boolean, default: false }, // Delivery Fee Payment Status
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
  isBotOrder: { type: Boolean, default: false },
  isReviewed: { type: Boolean, default: false },
  isReceived: { type: Boolean, default: false }, // User confirmed receipt
  completionOtp: { type: String }, // OTP to verify delivery (Legacy/Optional)
  mpesaCheckoutRequestId: { type: String }, // For tracking Mpesa STK Push
  paymentMethod: { type: String, enum: ['mpesa', 'cash', 'google_pay'], default: 'mpesa' },
  paymentData: { type: Object }, // Store full callback data
  riderAssignedAt: { type: Date },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  paidAt: { type: Date },
  reviewedAt: { type: Date },
  userConfirmedAt: { type: Date },
  statusUpdatedAt: { type: Date },
  prepTimeMinutes: { type: Number, default: 20 },
  etaMinutes: { type: Number },
  prepAlertedAt: { type: Date },
  overdueFlaggedAt: { type: Date },
  lateOrder: { type: Boolean, default: false },

  // Scheduling
  scheduledFor: { type: Date }, // If set, order is for future
  isScheduled: { type: Boolean, default: false },

  // Detailed Pricing Breakdown
  pricing: {
    type: {
    goodsTotal: Number,
    deliveryFee: Number, // The fee charged to customer
    serviceFee: Number,  // KES 30
    totalCost: Number
    },
  },

  // Calculated Splits
  distribution: {
    type: {
    vendorPayout: Number,
    riderPayout: Number,
    adminRevenue: Number,
    splits: Object
    },
  }
}, { timestamps: true });

OrderSchema.index({ mpesaCheckoutRequestId: 1 }, { sparse: true });

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

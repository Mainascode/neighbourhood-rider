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
  dropoff: String,
  items: [],
  status: {
    type: String,
    enum: ["pending", "pending_vendor", "assigned", "delivering", "delivered", "cancelled"],
    default: "pending",
  },
  paid: { type: Boolean, default: false },
  amount: { type: Number, default: 200 }, // Default delivery fee
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
  isBotOrder: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

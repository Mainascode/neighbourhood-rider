import mongoose from "mongoose";

const WishlistItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String },
    itemId: { type: String },
    name: { type: String, required: true },
    price: { type: Number },
    image: { type: String },
    addedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

WishlistItemSchema.index({ userId: 1, vendorId: 1, itemId: 1 });
WishlistItemSchema.index({ userId: 1, vendorId: 1, name: 1 });

export default mongoose.models.WishlistItem ||
  mongoose.model("WishlistItem", WishlistItemSchema);

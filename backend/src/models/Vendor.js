import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    storeName: { type: String, required: true },
    description: String,
    logo: String, // URL or Base64
    coverImage: String, // URL or Base64
    phone: { type: String, required: true },
    address: String,
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: [Number], // [lng, lat]
    },
    category: {
        type: String,
        enum: ["general", "shop", "pharmacy", "gas", "water", "market", "butchery", "liquor", "courier", "food"],
        default: "general"
    },
    // Payment Details
    mpesaType: {
        type: String,
        enum: ["till", "pochi", "paybill", "phone"],
        default: "pochi"
    },
    mpesaNumber: { type: String }, // The Till Number or Phone Number
    isOpen: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    inventory: [{
        name: String,
        price: Number,
        image: String,
        inStock: { type: Boolean, default: true }
    }]
}, { timestamps: true });

VendorSchema.index({ location: "2dsphere" });

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

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
    riderAcceptTimeoutSeconds: { type: Number },

    // Fixed Operating Hours (06:00 - 21:00) - Managed via virtual
    isOpen: { type: Boolean, default: true, index: true },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    isManuallyClosed: { type: Boolean, default: false },
    manualClosedAt: { type: Date },
    inventory: [{
            name: String,
            price: Number,
            image: String,
            inStock: { type: Boolean, default: true }
        }],

        // Performance Metrics
        metrics: {
            cancellationsToday: { type: Number, default: 0 },
            totalOrders30Days: { type: Number, default: 0 },
            totalCancels30Days: { type: Number, default: 0 },
            cancellationRate: { type: Number, default: 0 }, // Percentage 0-100
            rating: { type: Number, default: 5.0 }, // Average Rating
            ratingCount: { type: Number, default: 0 },
            vendorScore: { type: Number, default: 5.0 } // Weighted Score
        },

        // Penalties
        isSuspended: { type: Boolean, default: false },
        suspensionReason: { type: String },
        suspensionExpiresAt: { type: Date }
    }, {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// UX Virtuals
VendorSchema.virtual("availabilityState").get(function () {
    if (this.isOpen && !this.isManuallyClosed) {
        return "OPEN";
    }
    return "CLOSED";
});

VendorSchema.virtual("nextOpenTime").get(function () {
    return this.isOpen && !this.isManuallyClosed ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString();
});

VendorSchema.index({ location: "2dsphere" });
VendorSchema.index({ phone: 1 });

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

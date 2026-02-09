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

    // Fixed Operating Hours (06:00 - 21:00) - Managed via virtual
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

// Auto-Calculate Open Status
VendorSchema.virtual("isOpen").get(function () {
    const now = new Date();
    const currentHour = now.getHours(); // Local server time (EAT UTC+3)

    // Fixed Hours: 06:00 - 21:00
    const OPEN_TIME = 6;
    const CLOSE_TIME = 21;

    return currentHour >= OPEN_TIME && currentHour < CLOSE_TIME;
});

// UX Virtuals
VendorSchema.virtual("availabilityState").get(function () {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 6 && currentHour < 21) {
        return "OPEN";
    } else if (currentHour < 6) {
        return "CLOSED (Opens at 6:00 AM)";
    } else {
        return "CLOSED (Closed for the day)";
    }
});

VendorSchema.virtual("nextOpenTime").get(function () {
    const now = new Date();
    const currentHour = now.getHours();

    const nextOpen = new Date(now);
    nextOpen.setMinutes(0, 0, 0); // Reset mins/secs

    if (currentHour >= 21) {
        // Closed for day, opens tomorrow 6 AM
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(6);
    } else if (currentHour < 6) {
        // Early morning, opens today 6 AM
        nextOpen.setHours(6);
    } else {
        // Currently open, next open time is... now? or tomorrow?
        // Usually implied "Opens at..." is for closed shops.
        // Let's set it to tomorrow 6 AM if it's open, or just null/current?
        // Prompt says "Calculate nextOpenTime dynamically". 
        // If open, maybe next Close time? But request asks for Open Time.
        // Let's return tomorrow 6 AM just to be consistent for "next" cycle.
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(6);
    }

    // Format: "YYYY-MM-DD HH:mm" or ISO?
    // Let's return ISO string for frontend formatting
    return nextOpen.toISOString();
});

VendorSchema.index({ location: "2dsphere" });

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: "General" },
    isPublished: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("FAQ", faqSchema);

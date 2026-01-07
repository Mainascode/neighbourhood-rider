import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema({
    email: String,
    items: [String],
    location: String,
    summary: String,
    message: String,
    subject: { type: String, default: "General Inquiry" },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: "unread" }, // unread, read
});

export default mongoose.model("Inquiry", inquirySchema);

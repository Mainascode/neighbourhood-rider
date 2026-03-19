import mongoose from "mongoose";


const PaymentSchema = new mongoose.Schema({
orderId: String,
phone: String,
amount: Number,
status: String,
mpesaRef: String
}, { timestamps: true });


export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
import mongoose from "mongoose";

const AdminAuditLogSchema = new mongoose.Schema(
  {
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminEmail: { type: String },
    action: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    sourceIp: { type: String },
    userAgent: { type: String },
    payload: { type: Object },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ adminUserId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", AdminAuditLogSchema);

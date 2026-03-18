import connectDB from "../../../lib/db.js";
import Payment from "../../../models/Payment.js";
import { requireApiAdmin } from "../../../lib/api-auth.js";
import { fail, ok } from "../../../lib/response.js";

export async function GET() {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const payments = await Payment.find().sort({ createdAt: -1 }).lean();
  return ok({
    payments: payments.map((payment) => ({
      id: payment._id.toString(),
      amount: payment.amount,
      phone: payment.phone,
      status: payment.status,
      checkoutRequestId: payment.checkoutRequestId,
      receiptNumber: payment.receiptNumber,
      createdAtLabel: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(payment.createdAt),
    })),
  });
}

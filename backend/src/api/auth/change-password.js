import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";

export default async function changePassword(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { oldPassword, newPassword, confirmNewPassword } = req.body || {};

    if (!userId) return fail(res, "Unauthorized", 401);
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return fail(res, "All password fields are required", 400);
    }
    if (newPassword.length < 6) {
      return fail(res, "New password must be at least 6 characters", 400);
    }
    if (newPassword !== confirmNewPassword) {
      return fail(res, "New passwords do not match", 400);
    }
    if (oldPassword === newPassword) {
      return fail(res, "New password must be different from old password", 400);
    }

    const user = await User.findById(userId);
    if (!user) return fail(res, "User not found", 404);

    const validOld = await bcrypt.compare(oldPassword, user.password);
    if (!validOld) return fail(res, "Old password is incorrect", 400);

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return ok(res, { message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    return fail(res, "Failed to update password", 500);
  }
}

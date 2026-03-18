import User from "../../models/User.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export default async function resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with DB
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, data: "Password updated success! You can now login." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Reset failed" });
    }
}

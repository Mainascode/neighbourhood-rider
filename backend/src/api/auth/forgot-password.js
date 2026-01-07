import User from "../../models/User.js";
import crypto from "crypto";

export default async function forgotPassword(req, res) {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No user with that email" });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Set expire (1 hour)
        user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hr

        await user.save();

        // Mock Email Sending
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        const message = `You requested a password reset. Please go to this link to reset your password: \n\n ${resetUrl}`;

        console.log("------------------------------------------");
        console.log("📧 MOCK EMAIL TO:", email);
        console.log("📧 SUBJECT: Password Reset Request");
        console.log("📧 BODY:", message);
        console.log("------------------------------------------");

        res.status(200).json({ success: true, data: "Email sent (mocked - check server console)" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Email could not be sent" });
    }
}

import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";

function normalizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.replace(/[^\d+]/g, "");
}

export default async function updateAuthProfile(req, res) {
  const userId = req.user?._id || req.user?.id;
  if (!userId) return fail(res, "Unauthorized", 401);

  const { phone, acceptPrivacyPolicy, acceptTerms } = req.body || {};
  const user = await User.findById(userId);
  if (!user) return fail(res, "User not found", 404);

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    user.phone = normalizedPhone;
  }

  if (!user.privacyPolicyAcceptedAt && acceptPrivacyPolicy === true) {
    user.privacyPolicyAcceptedAt = new Date();
  }

  if (!user.termsAcceptedAt && acceptTerms === true) {
    user.termsAcceptedAt = new Date();
  }

  await user.save();

  return ok(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      privacyPolicyAcceptedAt: user.privacyPolicyAcceptedAt || null,
      termsAcceptedAt: user.termsAcceptedAt || null,
    },
  });
}


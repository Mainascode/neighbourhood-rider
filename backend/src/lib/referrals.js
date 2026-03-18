import User from "../models/User.js";
import SystemSetting from "../models/SystemSetting.js";

export async function applyReferralRewardIfEligible(referrerId) {
  if (!referrerId) {
    return;
  }

  const referrer = await User.findById(referrerId);
  if (!referrer || referrer.referralRewardGranted) {
    return;
  }

  const settings = await SystemSetting.findOne({ key: "global_config" }).lean();
  const unlockCount = settings?.referralUnlockCount || 2;
  const rewardCredits = settings?.referralRewardCredits || 1;

  const qualifiedUsers = await User.countDocuments({
    referredBy: referrer._id,
    hasCompletedOrder: true,
  });

  if (qualifiedUsers >= unlockCount) {
    referrer.referralRewardGranted = true;
    referrer.freeDeliveryCredits = (referrer.freeDeliveryCredits || 0) + rewardCredits;
    await referrer.save();
  }
}

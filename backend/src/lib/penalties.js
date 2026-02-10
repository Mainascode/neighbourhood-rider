import Rider from "../models/Rider.js";

export const PENALTY_CONFIG = {
  latePickupMinutes: 20,
  lateDeliveryMinutes: 45,
  latePickupLimit: 3,
  lateDeliveryLimit: 3,
  rejectionRateLimit: 0.3,
  minAssignmentsForRate: 10,
};

function ensurePenaltyDefaults(penalties = {}) {
  return {
    latePickupCount: penalties.latePickupCount || 0,
    lateDeliveryCount: penalties.lateDeliveryCount || 0,
    overdueDeliveryCount: penalties.overdueDeliveryCount || 0,
    rejectionCount: penalties.rejectionCount || 0,
    assignmentCount: penalties.assignmentCount || 0,
    rejectionRate: penalties.rejectionRate || 0,
    isDisabled: penalties.isDisabled || false,
    disabledAt: penalties.disabledAt || null,
    disabledReason: penalties.disabledReason || null,
    lastPenaltyAt: penalties.lastPenaltyAt || null,
  };
}

function shouldDisable(penalties) {
  if (penalties.isDisabled) return false;
  if (penalties.latePickupCount >= PENALTY_CONFIG.latePickupLimit) {
    return "LATE_PICKUP";
  }
  if (penalties.lateDeliveryCount >= PENALTY_CONFIG.lateDeliveryLimit) {
    return "LATE_DELIVERY";
  }
  if (
    penalties.assignmentCount >= PENALTY_CONFIG.minAssignmentsForRate &&
    penalties.rejectionRate >= PENALTY_CONFIG.rejectionRateLimit
  ) {
    return "HIGH_REJECTION_RATE";
  }
  return null;
}

async function updateRiderPenalties(riderId, updater) {
  const rider = await Rider.findById(riderId);
  if (!rider) return null;

  const penalties = ensurePenaltyDefaults(rider.penalties);
  updater(penalties);

  penalties.rejectionRate =
    penalties.assignmentCount > 0
      ? parseFloat((penalties.rejectionCount / penalties.assignmentCount).toFixed(3))
      : 0;

  const disableReason = shouldDisable(penalties);
  if (disableReason) {
    penalties.isDisabled = true;
    penalties.disabledAt = new Date();
    penalties.disabledReason = disableReason;
    rider.status = "OFFLINE";
    rider.isAvailable = false;
  }

  rider.penalties = penalties;
  await rider.save();
  return rider;
}

export async function recordAssignment(riderId) {
  return updateRiderPenalties(riderId, (penalties) => {
    penalties.assignmentCount += 1;
  });
}

export async function recordRejection(riderId) {
  return updateRiderPenalties(riderId, (penalties) => {
    penalties.rejectionCount += 1;
    penalties.lastPenaltyAt = new Date();
  });
}

export async function recordLatePickup(riderId) {
  return updateRiderPenalties(riderId, (penalties) => {
    penalties.latePickupCount += 1;
    penalties.lastPenaltyAt = new Date();
  });
}

export async function recordLateDelivery(riderId) {
  return updateRiderPenalties(riderId, (penalties) => {
    penalties.lateDeliveryCount += 1;
    penalties.lastPenaltyAt = new Date();
  });
}

export async function recordOverdueDelivery(riderId) {
  return updateRiderPenalties(riderId, (penalties) => {
    penalties.overdueDeliveryCount += 1;
    penalties.lastPenaltyAt = new Date();
  });
}

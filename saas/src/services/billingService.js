// saas/src/services/billingService.js
const prisma = require('../lib/prisma');

/**
 * ✅ UNIFIED HELPER (S98): Calculates account hardlock status with zero drift.
 * Used by Login, Sync, and Cron services.
 */
const getAccountHardlockState = (user, latestSub) => {
  const now = new Date();
  
  // 1. Identify effective expiry (Respect manual grace extensions)
  let effectiveExpiry = latestSub?.expiresAt ? new Date(latestSub.expiresAt) : new Date(user.registrationDate || user.createdAt);
  if (user.graceExtensionUntil && new Date(user.graceExtensionUntil) > effectiveExpiry) {
    effectiveExpiry = new Date(user.graceExtensionUntil);
  }

  // 2. Calculate Grace Period based on Plan Duration (Dynamic S72)
  let planDays = 30;
  if (latestSub?.plan) {
    planDays = latestSub.plan.billingCycle === 'MONTHLY' ? 30 : 365;
    if (latestSub.planId?.toLowerCase().includes('half') || latestSub.plan.name?.toLowerCase().includes('6 month')) {
      planDays = 180;
    }
  }

  // Standard Formula: 
  // Monthly (30-31 days) -> 3 days grace
  // Half-Year (180 days) -> 5 days grace
  // Yearly (365 days)    -> 7 days grace
  let graceDays = 7;
  if (planDays <= 31) graceDays = 3;
  else if (planDays <= 186) graceDays = 5;

  const graceEnd = new Date(effectiveExpiry);
  graceEnd.setDate(graceEnd.getDate() + graceDays);

  const isBypassed = user.hardlockBypass || false;
  const isHardlocked = now > graceEnd && !isBypassed;

  return {
    isHardlocked,
    graceDays,
    graceEnd,
    effectiveExpiry,
    isGraceActive: now > effectiveExpiry && now <= graceEnd
  };
};

module.exports = {
  getAccountHardlockState
};

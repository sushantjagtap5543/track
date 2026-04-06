import { PLANS } from './plans';

export const calculateNextBillingDate = (currentDate, planId) => {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return currentDate;

  const baseDate = currentDate > new Date() ? currentDate : new Date();
  const nextDate = new Date(baseDate);
  nextDate.setMonth(nextDate.getMonth() + plan.months);
  return nextDate;
};

export const createBillingLog = (user, planId, method, amount) => {
  const plan = PLANS.find((p) => p.id === planId);
  const history = JSON.parse(user.attributes.billingHistory || '[]');
  const newEntry = {
    date: new Date().toISOString(),
    planId,
    planName: plan?.name || 'Unknown',
    method,
    amount,
    status: 'COMPLETED',
  };
  return JSON.stringify([newEntry, ...history].slice(0, 50)); // Keep last 50 entries
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

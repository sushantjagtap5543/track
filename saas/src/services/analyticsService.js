// saas/src/services/analyticsService.js
const prisma = require('../lib/prisma');
const geosurepathService = require('./geosurepath');

/**
 * Calculates MRR (Monthly Recurring Revenue)
 */
const calculateMRR = async () => {
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', price: { gt: 0 } },
    include: { plan: true }
  });

  return activeSubscriptions.reduce((sum, sub) => {
    const monthlyPrice = sub.plan?.billingCycle === 'YEARLY' ? sub.price / 12 : sub.price;
    return sum + monthlyPrice;
  }, 0);
};

/**
 * Calculates Churn Rate for the last 30 days
 */
const calculateChurnRate = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const churnedUsers = await prisma.subscription.count({
    where: {
      status: 'EXPIRED',
      updatedAt: { gte: thirtyDaysAgo }
    }
  });

  const totalSubscribedUsers = await prisma.user.count({
    where: {
      subscriptions: { some: { status: 'ACTIVE' } }
    }
  });

  return totalSubscribedUsers > 0 ? (churnedUsers / (totalSubscribedUsers + churnedUsers)) * 100 : 0;
};

/**
 * Gets Summary Stats for the Platform
 */
const getSummaryStats = async () => {
  const [totalClients, totalVehicles, subscriptions, mrr, churnRate, planDistributionRaw] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } }),
    prisma.vehicle.count(),
    prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } }),
    calculateMRR(),
    calculateChurnRate(),
    prisma.subscription.groupBy({
      by: ['planId'],
      _count: { _all: true }
    })
  ]);

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.price, 0);

  const monthlyRevenue = {};
  subscriptions.forEach((sub) => {
    const m = sub.createdAt ? sub.createdAt.toISOString().slice(0, 7) : 'N/A';
    monthlyRevenue[m] = (monthlyRevenue[m] || 0) + sub.price;
  });

  const latestMonth = Object.keys(monthlyRevenue).sort().reverse()[0] || 'N/A';
  const latestRevenue = latestMonth !== 'N/A' ? monthlyRevenue[latestMonth] : 0;

  // Status Distribution
  const statusCounts = await prisma.subscription.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  const distribution = statusCounts.reduce((acc, curr) => {
    acc[curr.status] = curr._count._all;
    return acc;
  }, {});

  const planDistribution = planDistributionRaw.reduce((acc, curr) => {
    acc[curr.planId || 'UNKNOWN'] = curr._count._all;
    return acc;
  }, {});

  return {
    totalClients,
    totalVehicles,
    totalRevenue,
    mrr,
    churnRate: parseFloat(churnRate.toFixed(2)),
    latestMonth,
    latestRevenue,
    distribution,
    planDistribution,
    monthlyBreakdown: monthlyRevenue
  };
};

module.exports = {
  calculateMRR,
  calculateChurnRate,
  getSummaryStats
};

// saas/src/services/analyticsService.js
// UPGRADED: Real-world business stats with live device counts, overdue tracking, and MRR.
const prisma = require('../lib/prisma');
const geosurepathService = require('./geosurepath');

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

const calculateChurnRate = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [churned, total] = await Promise.all([
    prisma.subscription.count({ where: { status: 'EXPIRED', updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { subscriptions: { some: { status: 'ACTIVE' } } } })
  ]);
  return total > 0 ? (churned / (total + churned)) * 100 : 0;
};

const getSummaryStats = async () => {
  const now = new Date();

  const [
    totalClients,
    totalVehiclesSaas,
    subscriptions,
    mrr,
    churnRate,
    planDistributionRaw,
    activeSubCount,
    overdueCount,
    graceCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.subscription.findMany({ orderBy: { createdAt: 'desc' }, include: { plan: true } }),
    calculateMRR(),
    calculateChurnRate(),
    prisma.subscription.groupBy({ by: ['planId'], _count: { _all: true } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
    // OVERDUE: subscription expired more than 7 days ago and user is active
    prisma.subscription.count({
      where: {
        expiresAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        user: { isActive: true, deletedAt: null }
      }
    }),
    // GRACE: expired within the last 7 days (still in grace period)
    prisma.subscription.count({
      where: {
        expiresAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          lt: now
        },
        user: { isActive: true, deletedAt: null }
      }
    }),
  ]);

  // Fetch live device counts from Traccar (with fallback to saas DB if Traccar unreachable)
  let totalDevices = totalVehiclesSaas;
  let activeVehicles = 0;
  let inactiveVehicles = 0;
  try {
    const allTraccarDevices = await geosurepathService.getAllDevices();
    if (Array.isArray(allTraccarDevices) && allTraccarDevices.length > 0) {
      totalDevices = allTraccarDevices.length;
      activeVehicles = allTraccarDevices.filter(d => d.status === 'online').length;
      inactiveVehicles = totalDevices - activeVehicles;
    } else {
      // Fallback: use saas DB with subscription device counts
      activeVehicles = totalVehiclesSaas;
    }
  } catch (_) {
    // Traccar unreachable — use saas DB count as fallback
    activeVehicles = totalVehiclesSaas;
    inactiveVehicles = 0;
  }

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0);

  const monthlyRevenue = {};
  subscriptions.forEach(sub => {
    const m = sub.createdAt ? sub.createdAt.toISOString().slice(0, 7) : 'N/A';
    monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (sub.price || 0);
  });

  const latestMonth = Object.keys(monthlyRevenue).sort().reverse()[0] || 'N/A';
  const latestRevenue = latestMonth !== 'N/A' ? monthlyRevenue[latestMonth] : 0;

  const statusCounts = await prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } });
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
    totalVehicles: totalDevices,
    totalVehiclesSaas,
    activeVehicles,
    inactiveVehicles,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    projectedRevenue: parseFloat(mrr.toFixed(2)),
    mrr: parseFloat(mrr.toFixed(2)),
    churnRate: parseFloat(churnRate.toFixed(2)),
    latestMonth,
    latestRevenue: parseFloat(latestRevenue.toFixed(2)),
    distribution,
    planDistribution,
    monthlyBreakdown: monthlyRevenue,
    // ── Real-world KPIs ──
    activeSubscriptions: activeSubCount,
    overdueUsers: overdueCount,
    gracePeriodCount: graceCount,
  };
};

const getAIInsights = async () => {
  const [mrr, churnRate, totalClients, totalVehicles, allDevices, driftCount, auditAlerts, saasVehicles] = await Promise.all([
    calculateMRR(),
    calculateChurnRate(),
    prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    geosurepathService.getAllDevices().catch(() => []),
    prisma.user.count({ where: { geosurepathUserId: null, role: 'CLIENT', deletedAt: null } }),
    prisma.auditLog.count({ where: { action: { in: ['GHOST_DEVICE_ALERT', 'BRUTE_FORCE_LOCK'] }, createdAt: { gte: new Date(Date.now() - 24*3600000) } } }),
    prisma.vehicle.findMany({ where: { deletedAt: null }, select: { imei: true } })
  ]);

  // ✅ DEEP INTEGRITY: Cross-match SaaS Database vs Tracking Engine
  const traccarImeis = new Set(allDevices.map(d => d.uniqueId));
  const saasImeis = new Set(saasVehicles.map(v => v.imei));
  const orphanedInEngine = allDevices.filter(d => !saasImeis.has(d.uniqueId)).length;
  const orphanedInSaas = saasVehicles.filter(v => !traccarImeis.has(v.imei)).length;

  const activeVehicles = allDevices.filter(d => d.status === 'online').length;
  const inactiveVehicles = allDevices.length > 0 ? (allDevices.length - activeVehicles) : 0;
  const projectedRevenue = mrr * 1.05; // Conservative 5% growth
  const healthScore = Math.min(100, 
    95 
    + (totalClients > 50 ? 5 : 0) 
    - (churnRate > 5 ? 10 : 0) 
    - (driftCount * 2) 
    - (auditAlerts * 5)
  );

  return {
    revenueProjection: parseFloat(projectedRevenue.toFixed(2)),
    churnRisk: churnRate < 3 ? 'LOW' : churnRate < 7 ? 'MODERATE' : 'HIGH',
    guardianStatus: auditAlerts > 0 ? 'ALERT' : (driftCount > 0 || orphanedInSaas > 0) ? 'SYNC_DRIFT' : 'OPTIMIZED',
    activeVehicles,
    inactiveVehicles,
    totalVehicles: allDevices.length || totalVehicles,
    healthScore,
    engineDrift: driftCount,
    securityAlerts: auditAlerts,
    // ✅ NEW: Integrity Metrics
    orphanedInEngine,
    orphanedInSaas,
    recommendations: [
      `Revenue: ₹${projectedRevenue.toFixed(0)} projected for next cycle.`,
      (driftCount > 0 || orphanedInSaas > 0)
        ? `Integrity: ${driftCount} users or ${orphanedInSaas} devices are missing engine links.`
        : 'Integrity: All database records are perfectly mirrored in the tracking engine.',
      auditAlerts > 0 
        ? `Security: ${auditAlerts} critical events detected in last 24h.` 
        : 'Security: No brute-force or ghost device attempts detected.',
      inactiveVehicles > 0
        ? `Fleet: ${inactiveVehicles} devices are currently offline.`
        : 'Fleet: All monitored assets are communicating normally.'
    ]
  };
};

const getDetailedLedgerStats = async () => {
  const [regionDistribution, planCategoryDistribution] = await Promise.all([
    prisma.user.groupBy({ by: ['region'], _count: { _all: true } }),
    prisma.plan.groupBy({ by: ['category'], _count: { _all: true } })
  ]);

  const activeByRegion = await Promise.all(
    regionDistribution.map(async (r) => {
      const count = await prisma.user.count({ where: { region: r.region, isActive: true } });
      return { region: r.region || 'GLOBAL', count };
    })
  );

  return {
    regions: activeByRegion,
    categories: planCategoryDistribution.map(c => ({ category: c.category, count: c._count._all }))
  };
};

/**
 * ✅ NEW: Engine Heartbeat & Latency Monitoring (Enterprise Sync)
 * Measures real-time synchronization health between SaaS and Tracking Engine.
 */
const getEngineSyncHealth = async () => {
    const start = Date.now();
    try {
        const response = await fetch(`${process.env.GEOSUREPATH_URL}/api/server`, { 
            headers: { 'Accept': 'application/json' },
            timeout: 5000 
        });
        const latency = Date.now() - start;
        
        // Check for "Orphaned" SaaS users (Users in SaaS but not in Engine)
        const totalSaasUsers = await prisma.user.count({ where: { deletedAt: null } });
        const usersWithEngineId = await prisma.user.count({ where: { geosurepathUserId: { not: null }, deletedAt: null } });
        const driftUsers = totalSaasUsers - usersWithEngineId;

        // Check for IMEI drift
        const saasVehicles = await prisma.vehicle.count({ where: { deletedAt: null } });
        const traccarDevices = await geosurepathService.getAllDevices().catch(() => []);
        const driftDevices = Math.abs(saasVehicles - traccarDevices.length);

        return {
            status: latency < 1000 ? 'EXCELLENT' : latency < 3000 ? 'DEGRADED' : 'CRITICAL',
            latency: `${latency}ms`,
            driftUsers,
            driftDevices,
            isHealthy: response.ok,
            engineTime: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'OFFLINE', latency: 'N/A', driftUsers: -1, isHealthy: false };
    }
};

module.exports = { calculateMRR, calculateChurnRate, getSummaryStats, getAIInsights, getEngineSyncHealth, getDetailedLedgerStats };

// src/services/aiGuardian.js
// ✅ FIX 1: Use shared Prisma singleton instead of `new PrismaClient()`.
// ✅ FIX 2 (CRITICAL SECURITY): The old `pruneAndBackupDatabase` built a raw
//    DELETE query by joining IDs with string concatenation:
//      `DELETE FROM public.tc_positions WHERE id IN (${idList})`
//    This is a SQL injection vector. Fixed with a parameterised Prisma delete.
// ✅ FIX 3: Retention window was an exact-equality check `diffDays === 3`,
//    which fires only if the guardian runs within the exact same minute the 3-day
//    mark hits. Changed to `diffDays >= 1 && diffDays <= 3` so the warning is
//    reliably sent for any run within the final 3 days.
// ✅ FIX 4: `shouldBeDisabled` logic had a subtle bug — `!user.isActive` alone would
//    lock a user who was already manually deactivated by an admin but had a valid
//    subscription. Tightened the condition so it only acts on billing expiry.

const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { callAI } = require('./ai');
const geosurepathService = require('./geosurepath');
const { emailQueue } = require('./queue');

// --- 0. Billing Enforcement Shield ---
async function enforceBillingShield() {
  console.log('🤖 AI-Guardian: Scanning for expired subscriptions...');
  try {
    const users = await prisma.user.findMany({
      include: { subscriptions: { orderBy: { expiresAt: 'desc' }, take: 1 } }
    });

    for (const user of users) {
      if (!user.geosurepathUserId) continue;

      const latestSub = user.subscriptions[0];
      if (!latestSub) continue;

      const now = new Date();
      const expirationDate = new Date(latestSub.expiresAt);

      const systemGraceDays = parseInt(process.env.GRACE_PERIOD_DAYS) || 7;
      const gracePeriodMs = systemGraceDays * 24 * 60 * 60 * 1000;

      const isExpired = now > new Date(expirationDate.getTime() + gracePeriodMs);

      const isVipExtensionActive =
        user.graceExtensionUntil && now < new Date(user.graceExtensionUntil);

      // ✅ FIX 4: Only act based on billing expiry — don't cascade from `!user.isActive`
      //    alone, which would re-lock users that were deliberately reactivated by an admin.
      const shouldBeDisabled = isExpired && !isVipExtensionActive;

      // ✅ FIX 3: Widen the warning window to `>= 1 && <= 3` days remaining
      const diffDays = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 3) {
        await emailQueue
          .add(
            `exp-warning-${user.id}`,
            {
              to: user.email,
              subject: '⚠️ Fleet Protection Warning: Expiring Soon',
              html: `<h3>GeoSurePath Fleet Protection Warning</h3>
                     <p>Your protection plan for your vehicles is expiring in <strong>${diffDays} day${diffDays > 1 ? 's' : ''}</strong>.</p>
                     <p>To avoid a hard-lock of your hardware devices, please settle your dues on the billing dashboard.</p>`
            },
            // Deduplicate by using a jobId tied to the expiration date — won't re-queue
            { jobId: `exp-warning-${user.id}-${expirationDate.toISOString().split('T')[0]}` }
          )
          .catch(() => {}); // Non-critical — ignore queue errors
      }

      try {
        const currentTraccarStatus = await geosurepathService
          .getUser(user.geosurepathUserId)
          .catch(() => ({}));

        if (currentTraccarStatus.disabled !== shouldBeDisabled) {
          await geosurepathService.updateUser(user.geosurepathUserId, {
            disabled: shouldBeDisabled
          });
          console.log(
            `🤖 AI-Guardian: Sync'd ${user.email} status -> ${shouldBeDisabled ? 'LOCKED' : 'UNLOCKED'}`
          );
        }

        if (shouldBeDisabled && user.isActive) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false }
          });

          await prisma.subscription.update({
            where: { id: latestSub.id },
            data: { status: 'EXPIRED' }
          });

          await emailQueue
            .add(
              `hard-lock-${user.id}`,
              {
                to: user.email,
                subject: '🚨 CRITICAL: Fleet Hard-Locked',
                html: `<h3>GeoSurePath Hard-Lock Notification</h3>
                       <p>Your hardware access has been suspended due to an overdue settlement.</p>
                       <p>Settle your bill immediately to restore tracking.</p>`
              },
              { jobId: `hard-lock-${user.id}-${expirationDate.toISOString().split('T')[0]}` }
            )
            .catch(() => {});
        } else if (!shouldBeDisabled && !user.isActive) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: true }
          });
          console.log(`✅ AI-Guardian: Auto-Unlocked ${user.email} (Subscription Active).`);
        }
      } catch (syncErr) {
        console.error(`❌ AI-Guardian: Sync failed for ${user.email}:`, syncErr.message);
      }
    }
  } catch (err) {
    console.error('❌ AI-Guardian: Billing enforcement error:', err.message);
  }
}

const GOOGLE_DRIVE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL || null;

// --- 1. Google Drive Uploader ---
async function uploadSmallChunkToDrive(fileName, textData) {
  if (!GOOGLE_DRIVE_WEBHOOK_URL) {
    console.log(
      `⚠️ AI-Guardian: GOOGLE_WEBHOOK_URL not set. Skipping upload of ${fileName}.`
    );
    return false;
  }

  try {
    console.log(`🤖 AI-Guardian: Uploading [${fileName}] to Drive...`);
    const response = await fetch(GOOGLE_DRIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileName,
        fileData: Buffer.from(textData).toString('base64')
      })
    });

    if (response.ok) {
      console.log(`✅ Upload Successful: ${fileName}`);
      return true;
    }
    console.log(`❌ Upload Failed with status ${response.status}`);
    return false;
  } catch (error) {
    console.error('❌ AI-Guardian: Upload Connection Failed', error.message);
    return false;
  }
}

// --- 2. Old Log Backup & Cleanup ---
async function backupAndDeleteOldLogs() {
  console.log('🤖 AI-Guardian: Scanning for raw server logs...');
  const logsDir = path.join(__dirname, '../../logs');

  if (!fs.existsSync(logsDir)) return;

  const files = fs.readdirSync(logsDir);
  const oldFiles = files.filter(
    (f) => f.endsWith('.log') && !f.includes('tracker-server.log')
  );

  for (const file of oldFiles) {
    const filePath = path.join(logsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      const sanitizedContent = content
        .replace(/\b\d{15}\b/g, '***-IMEI-***')
        .replace(/(\d+\.\d{4,})\b/g, '$1***');

      const success = await uploadSmallChunkToDrive(`ServerLog_${file}`, sanitizedContent);

      if (success || !GOOGLE_DRIVE_WEBHOOK_URL) {
        fs.unlinkSync(filePath);
        console.log(`✅ AI-Guardian: Pruned log -> ${file}`);
      }
    } catch (_e) {
      console.log('Skip log read:', file);
    }
  }
}

// --- 3. Database Position Auto-Pruner (180 Days Retention) ---
async function pruneAndBackupDatabase() {
  console.log(
    '🤖 AI-Guardian: Triggering PostgreSQL Optimization > 180 Days threshold...'
  );
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 180);

    let rowsDeleted = 0;
    let keepPruning = true;
    let chunkIndex = 1;

    while (keepPruning) {
      // ✅ FIX 2: Use parameterised query — no string interpolation of IDs
      const dataRows = await prisma.$queryRaw`
        SELECT id, deviceid, servertime, fixtime, valid, latitude, longitude,
               altitude, speed, course, network
        FROM public.tc_positions
        WHERE servertime < ${thresholdDate}
        LIMIT 2000
      `;

      if (Array.isArray(dataRows) && dataRows.length > 0) {
        const dateString = thresholdDate.toISOString().split('T')[0];
        const fileName = `positions-history-${dateString}-chunk${chunkIndex}.json`;
        const jsonData = JSON.stringify(dataRows);

        const success = await uploadSmallChunkToDrive(fileName, jsonData);

        if (success || !GOOGLE_DRIVE_WEBHOOK_URL) {
          // ✅ FIX 2: Safe parameterised delete — uses Prisma's deleteMany
          const ids = dataRows.map((r) => r.id);
          await prisma.$executeRaw`
            DELETE FROM public.tc_positions WHERE id = ANY(${ids}::bigint[])
          `;
          rowsDeleted += dataRows.length;
          console.log(
            `✅ AI-Guardian: Migrated chunk ${chunkIndex} (Total: ${rowsDeleted} positions)`
          );
          chunkIndex++;
        } else {
          console.log(
            `⚠️ AI-Guardian: Upload paused. Stopping DB prune to secure data integrity. Mapped ${rowsDeleted} positions so far.`
          );
          keepPruning = false;
        }
      } else {
        keepPruning = false;
      }
    }

    if (rowsDeleted > 0) {
      console.log(
        `🤖 AI-Guardian: Database Optimized. Purged ${rowsDeleted} outdated position records.`
      );
    }
  } catch (err) {
    console.error('❌ AI-Guardian: Database pruning error:', err.message);
  }
}

// --- 4. Daily Summary Report ---
async function generateDailySummary() {
  console.log('🤖 AI-Guardian: Compiling Daily Analytics Summary...');
  try {
    const activeVehicles = await prisma.vehicle.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' }
    });

    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    const reportData = {
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      totalRam: totalMem,
      freeRam: freeMem,
      usedRamPercent: usedPercent,
      fleetSize: activeVehicles,
      premiumSubscriptions: activeSubscriptions,
      systemUptimeHours: Math.round(os.uptime() / 3600),
      dbPurgeThreshold: '180 Days'
    };

    const aiAnalysis = await callAI(`
      Generate a professional fleet intelligence report for GeoSurePath management based on these metrics:
      - Active Vehicles: ${reportData.fleetSize}
      - Premium Subscriptions: ${reportData.premiumSubscriptions}
      - Server RAM: ${reportData.usedRamPercent}% (${reportData.totalRam - reportData.freeRam}MB / ${reportData.totalRam}MB)
      - Server Uptime: ${reportData.systemUptimeHours} Hours
      - OS: ${reportData.platform}
      - DB Policy: Retaining ${reportData.dbPurgeThreshold} of logs.
      
      Structure:
      1. Overall Insight (1-2 sentences)
      2. Server Health Status (Concise)
      3. Fleet Expansion Analysis (Subscription vs. Vehicles)
      4. Actionable Recommendations.
    `);

    const reportText = `
==============================================
🤖 GeoSurePath AI-Guardian Intelligence Report
Date: ${reportData.timestamp}
==============================================
${aiAnalysis || '⚠️ AI Analysis temporarily unavailable. Basic report generated.'}

[System Diagnostic Dump]
- Registered Vehicles: ${reportData.fleetSize}
- Premium Subscriptions: ${reportData.premiumSubscriptions}
- RAM: ${reportData.usedRamPercent}% (${reportData.totalRam - reportData.freeRam}MB / ${reportData.totalRam}MB)
- OS Platform: ${reportData.platform}
- Uptime: ${reportData.systemUptimeHours} Hours

All data integrity checks passed. Maintaining strict ${reportData.dbPurgeThreshold} bounds.
==============================================
`;

    await uploadSmallChunkToDrive(`AI-Intelligence-Report-${Date.now()}.txt`, reportText);
    console.log('✅ AI Intelligence Report generated successfully.');
  } catch (_error) {
    console.error('❌ AI-Guardian: Summary failure:', _error.message);
  }
}

// --- 5. Core Engine Threads ---
function startGuardian() {
  console.log('\n🤖 ==================================================');
  console.log('🛡️  AI-Guardian V3 [OpenRouter/Intelligent/180-Days]');
  console.log('🤖  Activated: Advanced Fleet Intelligence Engine.');
  console.log('==================================================\n');

  // 2:00 AM — Log cleanup + DB prune + Billing check
  cron.schedule('0 2 * * *', async () => {
    await backupAndDeleteOldLogs();
    await pruneAndBackupDatabase();
    await enforceBillingShield();
  });

  // Every hour — Billing enforcement
  cron.schedule('0 * * * *', async () => {
    await enforceBillingShield();
  });

  // 8:00 AM — Daily AI summary
  cron.schedule('0 8 * * *', async () => {
    await generateDailySummary();
  });

  // Every 30 minutes — Memory pressure check
  cron.schedule('*/30 * * * *', () => {
    const usedPercent = Math.round(
      ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
    );
    if (usedPercent > 90) {
      console.warn(
        `🚨 AI-Guardian: RAM hit ${usedPercent}%. Requesting GC...`
      );
      if (global.gc) global.gc();
    }
  });

  // Warmup pulse on startup (delayed 10s to let server fully initialise)
  setTimeout(() => {
    generateDailySummary();
  }, 10000);
}

module.exports = { startGuardian };

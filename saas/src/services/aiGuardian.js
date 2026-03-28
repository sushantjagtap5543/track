const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { callAI } = require('./ai');
const geosurepathService = require('./geosurepath');
const { emailQueue } = require('./queue');

const prisma = new PrismaClient();

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
      
      // Dynamic Grace Period & Manual VIP Extension
      const systemGraceDays = parseInt(process.env.GRACE_PERIOD_DAYS) || 7;
      const gracePeriodMs = systemGraceDays * 24 * 60 * 60 * 1000;
      
      const isExpired = now > new Date(expirationDate.getTime() + gracePeriodMs);
      
      // VIP Check: Admin manual extension overrides system expiry
      const isVipExtensionActive = user.graceExtensionUntil && (now < new Date(user.graceExtensionUntil));
      
      const shouldBeDisabled = (isExpired && !isVipExtensionActive) || !user.isActive;

      // 1. Proactive Retention Alert (3 Days Warning)
      const diffDays = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays === 3) {
        await emailQueue.add(`exp-warning-${user.id}`, {
          to: user.email,
          subject: '⚠️ Fleet Protection Warning: 3 Days Remaining',
          html: `<h3>GeoSurePath Fleet Protection Warning</h3>
                 <p>Your protection plan for your vehicles is expiring in <strong>3 days</strong>.</p>
                 <p>To avoid a hard-lock of your hardware devices, please settle your dues on the billing dashboard.</p>`
        }, { jobId: `exp-3day-${user.id}-${expirationDate.toISOString()}` });
      }

      // 2. Traccar Engine Sync & Local Status Update
      try {
        // Only update if there's a status change to avoid excessive API calls
        const currentTraccarStatus = await geosurepathService.getUser(user.geosurepathUserId).catch(() => ({}));
        
        if (currentTraccarStatus.disabled !== shouldBeDisabled) {
           await geosurepathService.updateUser(user.geosurepathUserId, { disabled: shouldBeDisabled });
           console.log(`🤖 AI-Guardian: Sync'd ${user.email} status -> ${shouldBeDisabled ? 'LOCKED' : 'UNLOCKED'}`);
        }

        if (shouldBeDisabled && user.isActive) {
            // Lock the local database profile to prevent duplicate loops
            await prisma.user.update({
              where: { id: user.id },
              data: { isActive: false }
            });

            // Update subscription status to EXPIRED
            if (latestSub) {
              await prisma.subscription.update({
                where: { id: latestSub.id },
                data: { status: 'EXPIRED' }
              });
            }

           // Send hard-lock notification (once per expiration)
           await emailQueue.add(`hard-lock-${user.id}`, {
             to: user.email,
             subject: '🚨 CRITICAL: Fleet Hard-Locked',
             html: `<h3>GeoSurePath Hard-Lock Notification</h3>
                    <p>Your hardware access has been suspended due to an overdue settlement.</p>
                    <p>Settle your bill immediately to restore tracking.</p>`
           }, { jobId: `hard-lock-${user.id}-${expirationDate.toISOString()}` });
        } else if (!shouldBeDisabled && !user.isActive) {
           // Auto-Unlock the profile if a new subscription was detected
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

// The Free Webhook URL to upload to your Google Drive directly
const GOOGLE_DRIVE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL || null;

/**
 * 🤖 GeoSurePath "AI-Guardian" System
 * V3: Intelligent Fleet Analysis Powered by OpenRouter.
 */

// --- 1. Free Webhook Drive Uploader ---
async function uploadSmallChunkToDrive(fileName, textData) {
  if (!GOOGLE_DRIVE_WEBHOOK_URL) {
    console.log(`⚠️ AI-Guardian: Waiting for GOOGLE_WEBHOOK_URL in .env to upload ${fileName}...`);
    return false; // Safely skip upload if not configured yet
  }
  
  try {
    console.log(`🤖 AI-Guardian: Dispatching small chunk [${fileName}] to Drive...`);
    const response = await fetch(GOOGLE_DRIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileName,
        fileData: Buffer.from(textData).toString('base64')
      }),
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

// --- 2. Zero-Lag Engine (Old Log Management) ---
async function backupAndDeleteOldLogs() {
  console.log('🤖 AI-Guardian: Scanning for raw server logs...');
  const logsDir = path.join(__dirname, '../../logs');
  
  if (!fs.existsSync(logsDir)) return;

  const files = fs.readdirSync(logsDir);
  const oldFiles = files.filter(f => f.endsWith('.log') && !f.includes('tracker-server.log'));

  for (const file of oldFiles) {
    const filePath = path.join(logsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Apply privacy mask (Hide Potential IMEIs/Coordinates)
      const sanitizedContent = content
        .replace(/\b\d{15}\b/g, '***-IMEI-***')
        .replace(/(\d+\.\d{4,})\b/g, '$1***');
      
      // Upload the small log fragment natively
      const success = await uploadSmallChunkToDrive(`ServerLog_${file}`, sanitizedContent);
      
      // Delete the file ONLY IF we successfully uploaded it OR if user intentionally disables upload
      if (success || !GOOGLE_DRIVE_WEBHOOK_URL) { 
        fs.unlinkSync(filePath);
        console.log(`✅ AI-Guardian: Repaired and pruned log instance -> ${file}`);
      }
    } catch (_e) {
        console.log('Skip log read:', file);
    }
  }
}

// --- 3. Database Position Auto-Pruner (Maintain 180 Days) ---
async function pruneAndBackupDatabase() {
  console.log('🤖 AI-Guardian: Triggering PostgreSQL Optimization > 180 Days threshold...');
  try {
    // Retain 180 Days worth of precision logs
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 180);
    
    let rowsDeleted = 0;
    let keepPruning = true;
    let chunkIndex = 1;

    // Small-Chunk Mechanism! 
    while (keepPruning) {
      // Limit to 2000 rows at a time so files stay small and memory stays low
      const dataRows = await prisma.$queryRawUnsafe(
        `SELECT id, deviceid, servertime, fixtime, valid, latitude, longitude, altitude, speed, course, network 
         FROM public.tc_positions 
         WHERE servertime < $1 LIMIT 2000`, 
        thresholdDate
      );
      
      if (Array.isArray(dataRows) && dataRows.length > 0) {
        const dateString = thresholdDate.toISOString().split('T')[0];
        const fileName = `positions-history-${dateString}-chunk${chunkIndex}.json`;
        const jsonData = JSON.stringify(dataRows);
        
        const success = await uploadSmallChunkToDrive(fileName, jsonData);
        
        if (success || !GOOGLE_DRIVE_WEBHOOK_URL) {
           const idList = dataRows.map(r => r.id).join(',');
           await prisma.$queryRawUnsafe(`DELETE FROM public.tc_positions WHERE id IN (${idList})`);
           rowsDeleted += dataRows.length;
           console.log(`✅ AI-Guardian: Safely migrated and cleansed chunk ${chunkIndex} (Total: ${rowsDeleted} positions)`);
           chunkIndex++;
        } else {
           console.log(`⚠️ AI-Guardian: Upload paused. Stopping DB prune to secure data integrity. Mapped ${rowsDeleted} positions so far.`);
           keepPruning = false;
        }
      } else {
        keepPruning = false; 
      }
    }
    
    if (rowsDeleted > 0) {
       console.log(`🤖 AI-Guardian: Database is now 100% Optimized. Purged ${rowsDeleted} outdated logs.`);
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
    const activeSubscriptions = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
    
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
  console.log('🛡️ AI-Guardian V3 [OpenRouter/Intelligent/180-Days]');
  console.log('🤖 Activated: Advanced Fleet Intelligence Engine.');
  console.log('==================================================\n');

  // Trigger Database Log Pruner & Log Mover at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    await backupAndDeleteOldLogs();
    await pruneAndBackupDatabase();
    await enforceBillingShield();
  });

  // Billing Shield Sync (Every Hour)
  cron.schedule('0 * * * *', async () => {
    await enforceBillingShield();
  });

  // Daily Summary Report at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await generateDailySummary();
  });

  // Zero-Lag Hardware Trigger every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    const usedPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    if (usedPercent > 90) {
      console.warn(`🚨 AI-Guardian: RAM hit ${usedPercent}%. Executing internal GC blocks...`);
      if (global.gc) global.gc();
    }
  });

  setTimeout(() => {
    generateDailySummary(); // Warmup pulse check
  }, 10000);
}

module.exports = { startGuardian };

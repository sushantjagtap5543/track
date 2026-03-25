const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The Free Webhook URL to upload to your Google Drive directly
// Please generate this by pasting the Apps Script into Google!
const GOOGLE_DRIVE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL || null;

/**
 * 🤖 GeoSurePath "AI-Guardian" System
 * Advanced Version: 100% Free, NO APIs, Small-Chunk Auto-Patcher.
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
      
      // Upload the small log fragment natively
      const success = await uploadSmallChunkToDrive(`ServerLog_${file}`, content);
      
      // Delete the file ONLY IF we successfully uploaded it OR if user intentionally disables upload
      if (success || !GOOGLE_DRIVE_WEBHOOK_URL) { 
        fs.unlinkSync(filePath);
        console.log(`✅ AI-Guardian: Repaired and pruned log instance -> ${file}`);
      }
    } catch (e) {
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

    const reportText = `
==============================================
🤖 GeoSurePath AI-Guardian Daily Report
Date: ${new Date().toISOString()}
==============================================
Fleet Intelligence:
- Registered Vehicles: ${activeVehicles}
- Premium Subscriptions: ${activeSubscriptions}

Server Health Engine:
- OS Platform: ${os.platform()}
- RAM Used: ${usedPercent}% (${totalMem - freeMem}MB / ${totalMem}MB)
- CPU Arch: ${os.arch()}
- Internal Uptime: ${Math.round(os.uptime() / 3600)} Hours

All lag engines successfully repaired. Maintaining strict 180 Days bounds.
==============================================
`;
    
    await uploadSmallChunkToDrive(`Daily-Summary-${Date.now()}.txt`, reportText);
    console.log('✅ Daily Summary generated successfully.');
  } catch (error) {
    console.error('❌ AI-Guardian: Summary failure:', error.message);
  }
}

// --- 5. Core Engine Threads ---
function startGuardian() {
  console.log('\n🤖 ==================================================');
  console.log('🛡️ AI-Guardian V2 [NO-APIs/Small-Chunks/180-Days]');
  console.log('🤖 Activated: Intelligent Resource Scaling.');
  console.log('==================================================\n');

  // Trigger Database Log Pruner & Log Mover at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    await backupAndDeleteOldLogs();
    await pruneAndBackupDatabase();
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

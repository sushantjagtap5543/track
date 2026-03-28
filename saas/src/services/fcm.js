// src/services/fcm.js
// ✅ FIX 1: `sendToUser` previously created `new PrismaClient()` on every single call
//    (once per push notification event). This is the worst offender for connection
//    pool exhaustion — each call opened a new pool and never properly returned it.
//    Fixed to use the shared Prisma singleton.
// ✅ FIX 2: Added a null guard around `payload.data` values — FCM requires all data
//    values to be strings. Non-string values (e.g., integers, objects) cause the
//    entire batch send to fail silently. Serialised to string defensively.

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');

class FCMService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

      if (!fs.existsSync(serviceAccountPath)) {
        console.warn(
          '⚠️ Push Notifications: firebase-service-account.json not found. Push disabled.'
        );
        return;
      }

      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      this.initialized = true;
      console.log('✅ Push Notifications: Firebase Admin SDK Initialized.');
    } catch (error) {
      console.error('❌ Push Notifications: Initialization failed:', error.message);
    }
  }

  async sendToTokens(tokens, payload) {
    if (!this.initialized || !tokens || tokens.length === 0) return null;

    // ✅ FIX 2: Ensure all data values are strings — FCM rejects non-string values
    const safeData = {};
    if (payload.data) {
      for (const [key, val] of Object.entries(payload.data)) {
        safeData[key] = val !== null && val !== undefined ? String(val) : '';
      }
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: safeData,
        tokens: tokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'geosurepath_critical'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const failedTokens = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });
      }

      return { success: true, failedTokens };
    } catch (error) {
      console.error('❌ Push Notifications: Failed to send:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendToUser(userId, payload) {
    try {
      // ✅ FIX 1: Use shared singleton — no new PrismaClient() here
      const tokenRecords = await prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true }
      });

      const tokens = tokenRecords.map((r) => r.token);
      if (tokens.length === 0) return null;

      const result = await this.sendToTokens(tokens, payload);

      // Cleanup stale/invalid tokens from the database
      if (result?.failedTokens?.length > 0) {
        await prisma.deviceToken.deleteMany({
          where: { token: { in: result.failedTokens } }
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Push Notifications: User lookup/cleanup failed:', error.message);
      return null;
    }
  }
}

module.exports = new FCMService();

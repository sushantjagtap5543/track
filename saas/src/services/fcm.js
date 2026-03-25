const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

class FCMService {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        try {
            const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
            
            if (!fs.existsSync(serviceAccountPath)) {
                console.warn('⚠️ Push Notifications: firebase-service-account.json not found. Push disabled.');
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
        if (!this.initialized || !tokens || tokens.length === 0) return;

        try {
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
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
            
            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            failedTokens.push(tokens[idx]);
                        }
                    }
                });
                return { success: true, failedTokens };
            }

            return { success: true, failedTokens: [] };
        } catch (error) {
            console.error('❌ Push Notifications: Failed to send:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendToUser(userId, payload) {
        // This will be used by the event handler
        // Needs prisma to fetch tokens
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const tokenRecords = await prisma.deviceToken.findMany({
                where: { userId },
                select: { token: true }
            });

            const tokens = tokenRecords.map(r => r.token);
            if (tokens.length > 0) {
                const result = await this.sendToTokens(tokens, payload);
                
                // Cleanup invalid tokens from DB
                if (result?.failedTokens?.length > 0) {
                    await prisma.deviceToken.deleteMany({
                        where: { token: { in: result.failedTokens } }
                    });
                }
                return result;
            }
        } catch (error) {
            console.error('❌ Push Notifications: User lookup/cleanup failed:', error);
        } finally {
            await prisma.$disconnect();
        }
    }
}

module.exports = new FCMService();

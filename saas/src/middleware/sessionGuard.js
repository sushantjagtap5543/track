// saas/src/middleware/sessionGuard.js
const { redisConnection } = require('../services/queue');

// Default inactivity timeout: 30 minutes
const INACTIVITY_TIMEOUT = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || (30 * 60 * 1000).toString());

/**
 * Middleware to enforce session inactivity guards.
 * Uses the refreshToken as a session identifier to track last activity in Redis.
 */
const sessionGuard = async (req, res, next) => {
    // Only apply to authenticated requests (token or refreshToken must exist)
    const { refreshToken, token } = req.cookies;
    
    // If no session exists, skip (authMiddleware will handle unauthorized access)
    if (!refreshToken) {
        return next();
    }

    try {
        const lastActivity = await redisConnection.get(`activity:${refreshToken}`);
        const now = Date.now();

        if (lastActivity) {
            const idleTime = now - parseInt(lastActivity);
            if (idleTime > INACTIVITY_TIMEOUT) {
                console.warn(`[SessionGuard] Inactivity timeout for token: ${refreshToken.substring(0, 8)}... (Idle: ${Math.round(idleTime/1000)}s)`);
                
                // Clear cookies and reject
                res.clearCookie('token');
                res.clearCookie('refreshToken');
                res.clearCookie('JSESSIONID'); // Traccar session
                
                return res.status(401).json({ 
                    error: 'Session expired due to inactivity. Please log in again.',
                    inactivity: true 
                });
            }
        }

        // Update last activity timestamp (don't wait for write to finish for performance)
        redisConnection.set(`activity:${refreshToken}`, now.toString(), 'PX', INACTIVITY_TIMEOUT + (24 * 60 * 60 * 1000)); // Expire key after timeout + 1 day
        
        next();
    } catch (error) {
        console.error('[SessionGuard] Error:', error.message);
        // Fail open to avoid blocking users if Redis is down, but log it
        next();
    }
};

module.exports = sessionGuard;

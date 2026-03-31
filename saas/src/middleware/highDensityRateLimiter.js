const redis = require('../lib/redis');

/**
 * High-Density Distributed Rate Limiter
 * Uses Redis atomic operations (INCR + EXPIRE) for O(1) performance.
 */
const highDensityRateLimiter = (options) => {
  const { windowMs, max, message } = options;
  
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}:${req.originalUrl}`;
    
    try {
      const hits = await redis.incr(key);
      
      if (hits === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }
      
      if (hits > max) {
        return res.status(429).json(message || { error: 'Too many requests. Please slow down.' });
      }
      
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - hits));
      
      next();
    } catch (err) {
      console.warn('[RateLimiter] Redis failure, bypassing check:', err.message);
      next(); // Fail open for 0-lag availability
    }
  };
};

const authLimiter = highDensityRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const billingLimiter = highDensityRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 500, // 500 per minute for billing
  message: { error: 'Too many billing requests. Please slow down.' }
});

const globalLimiter = highDensityRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 2000, // 2000 per minute per IP
  message: { error: 'Global rate limit exceeded.' }
});

module.exports = { authLimiter, billingLimiter, globalLimiter };

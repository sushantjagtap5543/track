const IORedis = require('ioredis');

const redis = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Redis] Redis not available. Performance will degrade slightly.');
  } else {
    console.error('[Redis] Error:', err.message);
  }
});

module.exports = redis;

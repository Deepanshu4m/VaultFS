import pool from '../config/db.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT = 100;
const WINDOW_SECONDS = 60;

const checkRateLimit = async (apiKey) => {
  const redisKey = `rate_limit:${apiKey}`;

  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, WINDOW_SECONDS);
  }

  const ttl = await redis.ttl(redisKey);

  if (count > RATE_LIMIT) {
    return { allowed: false, remaining: 0, ttl };
  }

  return { allowed: true, remaining: RATE_LIMIT - count, ttl };
};

export const requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ message: 'API key is required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE key = $1 AND is_active = TRUE',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid or revoked API key' });
    }

    const rateLimit = await checkRateLimit(apiKey);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.ttl);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        message: 'Rate limit exceeded. Try again after the window resets.',
        retryAfterSeconds: rateLimit.ttl
      });
    }

    req.apiKey = result.rows[0];
    next();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
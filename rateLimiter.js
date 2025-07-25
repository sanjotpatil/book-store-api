// Simple in-memory rate limiter (per user, per hour)
const rateLimiters = {};
const LIMIT = 100;
const WINDOW = 60 * 60 * 1000; // 1 hour

function rateLimiter(req, res, next) {
  const userId = req.user ? req.user.id : req.ip;
  const now = Date.now();
  let rl = rateLimiters[userId];
  if (!rl || now - rl.start > WINDOW) {
    // New window for this user
    rl = { count: 1, start: now };
    rateLimiters[userId] = rl;
    return next();
  }
  if (rl.count >= LIMIT) {
    const wait = Math.ceil((WINDOW - (now - rl.start)) / 1000);
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${wait} seconds.` });
  }
  rl.count++;
  next();
}

module.exports = rateLimiter;

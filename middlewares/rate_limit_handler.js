const rateLimit = require('express-rate-limit');

const generalReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
});

const generalWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

module.exports = { generalReadLimiter, generalWriteLimiter };

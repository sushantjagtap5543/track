const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: 'Too many attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const billingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 payment-related requests
  message: { error: 'Payment attempt limit reached. Please contact support if you are having issues.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, billingLimiter };

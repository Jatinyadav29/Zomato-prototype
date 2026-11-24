const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Brute-force protection for the auth routes. Counters live in memory, so they
// reset on restart and are per-process; use a shared store (e.g. Redis) if you
// ever run more than one server.
// Behind a reverse proxy, set app.set("trust proxy", 1) so req.ip is the real client.

const MINUTE = 60 * 1000;

function limiter({ windowMs, limit, message, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message },
    ...rest,
  });
}

// 10 failed logins per 15 min for one email from one IP. Successful logins don't count.
// Keyed by IP + email so an attacker can't lock a victim out from somewhere else.
const loginLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  message: "Too many failed login attempts. Try again in 15 minutes.",
});

const registerLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: "Too many accounts created from this IP. Try again later.",
});

const refreshLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 60,
  message: "Too many requests. Try again later.",
});

module.exports = { loginLimiter, registerLimiter, refreshLimiter };

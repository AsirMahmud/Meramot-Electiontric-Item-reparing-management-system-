import rateLimit from "express-rate-limit";

/**
 * Global API rate limiter — generous for normal usage.
 * 200 requests per IP per 15-minute window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

/**
 * Aggressive rate limiter for the vendor application endpoint.
 * bcrypt is CPU-intensive — an attacker could DoS the server by
 * spamming this endpoint. 5 attempts per IP per 15-minute window.
 */
export const vendorApplyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many vendor applications submitted. Please wait 15 minutes before trying again.",
  },
});

/**
 * Strict rate limiter for authentication endpoints (login / register).
 * 10 attempts per IP per 15-minute window to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please wait 15 minutes." },
});

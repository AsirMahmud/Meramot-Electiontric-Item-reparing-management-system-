/**
 * Global API rate limiter — generous for normal usage.
 * 200 requests per IP per 15-minute window.
 */
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Aggressive rate limiter for the vendor application endpoint.
 * bcrypt is CPU-intensive — an attacker could DoS the server by
 * spamming this endpoint. 5 attempts per IP per 15-minute window.
 */
export declare const vendorApplyRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for authentication endpoints (login / register).
 * 10 attempts per IP per 15-minute window to prevent brute-force attacks.
 */
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rate-limit.d.ts.map
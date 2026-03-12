import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env.js";

function getFirstHeaderValue(headerValue) {
  if (Array.isArray(headerValue)) {
    return headerValue[0]?.trim();
  }

  if (typeof headerValue !== "string") {
    return undefined;
  }

  return headerValue.split(",")[0]?.trim();
}

export function getClientIp(req) {
  const cloudflareIp = getFirstHeaderValue(req.headers["cf-connecting-ip"]);

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedIp = getFirstHeaderValue(req.headers["x-forwarded-for"]);

  if (forwardedIp) {
    return forwardedIp;
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

export const apiRateLimiter = rateLimit({
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: "Too many requests, please try again later.",
        statusCode: 429,
      },
    });
  },
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  legacyHeaders: false,
  standardHeaders: true,
  skip: (req) => req.path === "/health",
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
});
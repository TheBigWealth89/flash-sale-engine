import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../db/connections.js";
import { AuthRequest } from "./authenticate.js";
import { Response, NextFunction } from "express";

/*
 Creates a RedisStore for express-rate-limit.
 - Each limiter gets its own store instance (isolated state).
 - `sendCommand` adapts ioredis v5 (`redisClient.call`) so the store can run Redis commands.
 - Redis provides centralized, atomic counters so limits work correctly across processes/containers.
*/
const makeStore = () =>
  new RedisStore({
    // Proper ioredis v5 call signature
    // The library expects a function that can execute Redis commands, so we provide a wrapper around the ioredis client.
    sendCommand: (command, ...args) => redisClient.call(command, ...args),
  });

const baseConfig = {
  standardHeaders: true, // sends RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  legacyHeaders: false, // disables X-RateLimit-* (deprecated)

  keyGenerator: (req: AuthRequest, res: Response) => req.user?.id || (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
  handler: (req: AuthRequest, res: Response, next: NextFunction, options: any) => {
    res.status(429).json({
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    });
  },

  // Skip health checks to avoid exhausting IP limits via load balancers
  skip: (req: AuthRequest) => req.path === "/health",
};

export const reserveLimiter = rateLimit({
  ...baseConfig,
  store: makeStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes (more forgiving for bursty networks)
  max: 10,
  message: "Too many reservation attempts, please try again later.",
});

export const paymentLimiter = rateLimit({
  ...baseConfig,
  store: makeStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: "Too many payment attempts, please try again later.",
});

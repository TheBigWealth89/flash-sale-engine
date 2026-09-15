import "../config/loadEnv.js";
import { Request, Response, NextFunction } from "express";
import stripe from "../config/stripe.js";
import logger from "../utils/logger.js";
import { WebhookRequest } from "../routes/webhook.js";

export const verifyStripeWebhook = (req: WebhookRequest, res: Response, next: NextFunction) => {
  const sig = req.headers["stripe-signature"];
  try {
    req.stripeEvent = stripe.webhooks.constructEvent(
      req.body,
      sig as string | string[],
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    next();
  } catch (err: any) {
    logger.error("Stripe verification failed:", err.message);
    res.status(400).send("Invalid Stripe signature");
  }
};

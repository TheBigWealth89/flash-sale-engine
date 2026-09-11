import { Server } from "socket.io";
import { redisClient } from "../db/connections.js";
import logger from "../utils/logger.js";

let io: Server;

export function initSockets(httpServer: any) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", 
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);
    
    // Users join rooms based on the product they are viewing
    socket.on("join-product", (productId) => {
      socket.join(`product-${productId}`);
      logger.debug(`Socket ${socket.id} joined room product-${productId}`);
    });

    socket.on("leave-product", (productId) => {
      socket.leave(`product-${productId}`);
      logger.debug(`Socket ${socket.id} left room product-${productId}`);
    });
  });

  const subscriber = redisClient.duplicate();
  
  subscriber.on("error", (err: any) => logger.error("Redis Subscriber Error:", err));
  
  subscriber.subscribe("inventory-updates", (err: any, count: any) => {
    if (err) {
      logger.error("Failed to subscribe:", err);
    } else {
      logger.info(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
  });

  subscriber.on("message", (channel: string, message: string) => {
    if (channel === "inventory-updates") {
      const data = JSON.parse(message);
      // Broadcast only to the room for that specific product
      io.to(`product-${data.productId}`).emit("inventory-update", data.newInventory);
    }
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

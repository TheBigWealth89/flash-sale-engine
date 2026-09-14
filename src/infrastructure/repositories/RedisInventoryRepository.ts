import { Redis } from 'ioredis';
import { IInventoryRepository } from '../../domain/interfaces/IInventoryRepository.js';
import { redisKey } from '../../utils/redisKeys.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reserveLuaScript = fs.readFileSync(path.join(__dirname, '../../../decrement_inventory.lua'), 'utf8');

export class RedisInventoryRepository implements IInventoryRepository {
  constructor(private redis: Redis) {}

  async getInventory(productId: number): Promise<number | null> {
    const inventory = await this.redis.get(redisKey.inventoryKey(productId));
    return inventory !== null ? parseInt(inventory, 10) : null;
  }

  async decrementInventory(productId: number): Promise<number> {
    const newInventory = await this.redis.eval(reserveLuaScript, 1, redisKey.inventoryKey(productId)) as number;
    return newInventory;
  }

  async incrementInventory(productId: number): Promise<number> {
    return await this.redis.incr(redisKey.inventoryKey(productId));
  }

  async setReservationHold(productId: number, userId: string, reservationId: string, ttlSeconds: number): Promise<void> {
    const key = redisKey.reservationKey(productId, userId, reservationId);
    await this.redis.setex(key, ttlSeconds, 'reserved');
  }

  async publishInventoryUpdate(productId: number, newInventory: number): Promise<void> {
    const updateMessage = JSON.stringify({ productId, newInventory });
    await this.redis.publish("inventory-updates", updateMessage);
  }
}

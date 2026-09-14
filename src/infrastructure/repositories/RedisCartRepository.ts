import { Redis } from 'ioredis';
import { ICartRepository } from '../../domain/interfaces/ICartRepository.js';
import { redisKey } from '../../utils/redisKeys.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure paths are correct when compiled
const validateCartLua = fs.readFileSync(path.join(__dirname, '../../../validate_cart.lua'), 'utf8');

export class RedisCartRepository implements ICartRepository {
  constructor(private redis: Redis) {}

  async addToCart(userId: string, reservationEntry: string): Promise<void> {
    await this.redis.sadd(redisKey.cartKey(userId), reservationEntry);
  }

  async getCartItems(userId: string): Promise<string[]> {
    return await this.redis.smembers(redisKey.cartKey(userId));
  }

  async clearCart(userId: string): Promise<void> {
    await this.redis.del(redisKey.cartKey(userId));
  }

  async validateCartCheckout(userId: string): Promise<{ validItems: string[]; expiredItems: string[] }> {
    const [validItems, expiredItems] = await this.redis.eval(validateCartLua, 1, redisKey.cartKey(userId), userId) as [string[], string[]];
    return { validItems, expiredItems };
  }
}

import { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import { IInventoryRepository } from '../../domain/interfaces/IInventoryRepository.js';
import { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import { ICartRepository } from '../../domain/interfaces/ICartRepository.js';
import { v4 as uuidv4 } from 'uuid';
import { redisKey } from '../../utils/redisKeys.js';
import logger from '../../utils/logger.js';

export class ReservationService {
  constructor(
    private productRepo: IProductRepository,
    private inventoryRepo: IInventoryRepository,
    private orderRepo: IOrderRepository,
    private cartRepo: ICartRepository
  ) {}

  async reserveProduct(productId: number, userId: string) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newInventory = await this.inventoryRepo.decrementInventory(productId);
    logger.info(`Lua returned inventory ${newInventory}`);
    
    if (newInventory < 0) {
      throw new Error('Out of stock');
    }

    await this.inventoryRepo.publishInventoryUpdate(productId, newInventory);

    const reservationId = uuidv4();
    const cartEntry = redisKey.cartEntry(productId, reservationId);
    
    // 10 minutes (600,000ms)
    const tenMinutesFromNow = new Date(Date.now() + 600000); 

    const order = await this.orderRepo.createOrder({
      product_id: productId,
      user_id: userId,
      expires_at: tenMinutesFromNow,
      reservation_id: cartEntry,
      amount: product.price,
      status: 'reserved',
      stripe_payment_intent_id: null
    });

    await this.inventoryRepo.setReservationHold(productId, userId, reservationId, 600);
    await this.cartRepo.addToCart(userId, cartEntry);

    logger.info(`Product ${productId} reserved for user ${userId}. Hold expires in 10 minutes.`);
    logger.info(`Reservation successfully for product ${productId}. New inventory: ${newInventory}`);

    return {
      message: 'Reservation successfully',
      inventory: newInventory,
      reservationKey: redisKey.reservationKey(productId, userId, reservationId),
    };
  }
}

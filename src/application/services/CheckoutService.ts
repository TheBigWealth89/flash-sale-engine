import { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import { ICartRepository } from '../../domain/interfaces/ICartRepository.js';
import logger from '../../utils/logger.js';
import stripe from '../../config/stripe.js';
import { Pool, PoolClient } from 'pg'; // For transactions since repository boundaries might not span transactions natively without a Unit of Work pattern

export class CheckoutService {
  constructor(
    private productRepo: IProductRepository,
    private orderRepo: IOrderRepository,
    private cartRepo: ICartRepository,
    private pool: Pool // Temporary injected pool for transaction management
  ) {}

  async getCartDetails(userId: string) {
    const cartItems = await this.cartRepo.getCartItems(userId);
    
    if (cartItems.length === 0) {
      return { productsInCart: [], totalAmountForDisplay: '0.00', totalAmountInCents: 0 };
    }

    const productQuantities: Record<string, number> = {};
    cartItems.forEach((item) => {
      const productId = item.split(':')[0];
      productQuantities[productId] = (productQuantities[productId] || 0) + 1;
    });

    const uniqueProductIds = Object.keys(productQuantities).map((id) => parseInt(id, 10));
    const products = await this.productRepo.findByIds(uniqueProductIds);

    let totalAmountInCents = 0;
    const productsInCart = products.map((product) => {
      const quantity = productQuantities[product.id];
      const priceInDollars = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      const priceInCents = Math.round(priceInDollars * 100);
      const totalPriceForProduct = priceInCents * quantity;

      totalAmountInCents += totalPriceForProduct;

      return {
        ...product,
        quantity,
        priceInCents,
        totalPrice: totalPriceForProduct,
      };
    });

    const totalAmountForDisplay = (totalAmountInCents / 100).toFixed(2);

    return { productsInCart, totalAmountForDisplay, totalAmountInCents };
  }

  async createPaymentIntent(userId: string) {
    logger.info('Creating payment intent...');
    let client: PoolClient | null = null;
    let compensationClient: PoolClient | null = null;
    let successfulItems: string[] = [];

    try {
      logger.info('Starting cart validation....');
      const { validItems, expiredItems } = await this.cartRepo.validateCartCheckout(userId);
      logger.info('Cart validation completed');
      logger.info(`Validated items: ${JSON.stringify(validItems)}`);
      logger.info(`Failed items: ${JSON.stringify(expiredItems)}`);

      successfulItems = validItems;

      if (successfulItems.length === 0) {
        return { success: false, message: 'Checkout failed. No valid reservations found.', expired_or_invalid: expiredItems };
      }

      // Start transaction
      client = await this.pool.connect();
      await client.query('BEGIN');

      const reservationIds = successfulItems;
      const orderResult = await client.query(
        `UPDATE orders 
         SET status = 'payment_pending', updated_at = NOW()
         WHERE reservation_id = ANY($1) AND status = 'reserved'
         RETURNING id, amount, reservation_id`,
        [reservationIds]
      );

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'No valid orders found for payment processing' };
      }

      const totalAmount = orderResult.rows.reduce((sum, row) => {
        return sum + parseFloat(row.amount) * 100;
      }, 0);

      const createOrderIds = orderResult.rows.map((row) => row.id);
      await client.query('COMMIT');

      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount),
        currency: 'usd',
        metadata: {
          order_ids: createOrderIds.join(','),
          user_id: userId
        },
      });

      logger.info(`Client secret ${paymentIntent.client_secret}`);
      return { success: true, clientSecret: paymentIntent.client_secret };

    } catch (err) {
      logger.error('Error during payment intent creation:', err);

      if (client) {
        try { await client.query('ROLLBACK'); } catch (e) {}
      }

      if (successfulItems.length > 0) {
        logger.warn('Initiating compensation back to reserved state...');
        try {
          compensationClient = await this.pool.connect();
          await compensationClient.query('BEGIN');
          await compensationClient.query(
            `UPDATE orders 
             SET status = 'reserved', updated_at = NOW()
             WHERE reservation_id = ANY($1) AND status = 'payment_pending'`,
            [successfulItems]
          );
          await compensationClient.query('COMMIT');
          logger.info('Compensation successful. Orders are back in a reserved state.');
        } catch (compensationError) {
          if (compensationClient) {
            try { await compensationClient.query('ROLLBACK'); } catch (e) {}
          }
          logger.error('!!! CRITICAL: COMPENSATION FAILED !!! Manual intervention required.', compensationError);
        }
      }

      throw new Error('Failed to process payment.');
    } finally {
      if (client) client.release();
      const compClient = compensationClient as PoolClient | null;
      if (compClient) compClient.release();
    }
  }
}

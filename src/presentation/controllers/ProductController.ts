import { Request, Response } from 'express';
import { ReservationService } from '../../application/services/ReservationService.js';
import { CheckoutService } from '../../application/services/CheckoutService.js';
import { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import { IInventoryRepository } from '../../domain/interfaces/IInventoryRepository.js';
import logger from '../../utils/logger.js';

export class ProductController {
  constructor(
    private reservationService: ReservationService,
    private checkoutService: CheckoutService,
    private productRepo: IProductRepository,
    private inventoryRepo: IInventoryRepository
  ) {}

  async getProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await this.productRepo.findById(id);

      if (!product) {
        return res.status(404).send('Product not found');
      }

      const inventory = await this.inventoryRepo.getInventory(id);
      if (inventory !== null) {
        product.inventory = inventory;
      }

      res.setHeader('Cache-Control', 'no-store');
      res.render('product', { product });
    } catch (err) {
      logger.error(`Error getting product: ${err}`);
      res.status(500).send('Server error');
    }
  }

  async reserveProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      // @ts-ignore - req.user is set by auth middleware
      const userId = req.user.id;

      const result = await this.reservationService.reserveProduct(id, userId);
      res.json(result);
    } catch (err: any) {
      logger.error('Error in reservation:', err);
      if (err.message === 'Out of stock') {
        return res.status(400).json({ error: 'Out of stock' });
      }
      res.status(500).json({ error: 'server error' });
    }
  }

  async getCart(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const { productsInCart, totalAmountForDisplay, totalAmountInCents } = await this.checkoutService.getCartDetails(userId);

      res.render('orderPage', {
        cartItems: productsInCart,
        totalAmountForDisplay,
        totalAmountInCents,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (err) {
      logger.error('Failed to render checkout page:', err);
      res.status(500).send('Error loading checkout page.');
    }
  }

  async createPaymentIntent(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const result = await this.checkoutService.createPaymentIntent(userId);

      if (!result.success) {
        return res.status(400).json({
          message: result.message,
          expired_or_invalid: result.expired_or_invalid,
        });
      }

      res.send({ clientSecret: result.clientSecret });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process payment.' });
    }
  }
}

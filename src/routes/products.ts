import { Router } from 'express';
import { ProductController } from '../presentation/controllers/ProductController.js';
import { ReservationService } from '../application/services/ReservationService.js';
import { CheckoutService } from '../application/services/CheckoutService.js';
import { PostgresProductRepository } from '../infrastructure/repositories/PostgresProductRepository.js';
import { PostgresOrderRepository } from '../infrastructure/repositories/PostgresOrderRepository.js';
import { RedisCartRepository } from '../infrastructure/repositories/RedisCartRepository.js';
import { RedisInventoryRepository } from '../infrastructure/repositories/RedisInventoryRepository.js';
import { pool, redisClient } from '../db/connections.js';
import { reserveLimiter, paymentLimiter } from '../middleware/rateLimiter.js';

// Setup Dependency Injection manually
const productRepo = new PostgresProductRepository(pool);
const orderRepo = new PostgresOrderRepository(pool);
const cartRepo = new RedisCartRepository(redisClient);
const inventoryRepo = new RedisInventoryRepository(redisClient);

const reservationService = new ReservationService(productRepo, inventoryRepo, orderRepo, cartRepo);
const checkoutService = new CheckoutService(productRepo, orderRepo, cartRepo, pool);

const productController = new ProductController(reservationService, checkoutService, productRepo, inventoryRepo);

const router = Router();

router.get('/:id', productController.getProduct.bind(productController));
router.post('/:id/reserve', reserveLimiter, productController.reserveProduct.bind(productController));
router.get('/', productController.getCart.bind(productController));
router.post('/create-payment-intent', paymentLimiter, productController.createPaymentIntent.bind(productController));

export default router;

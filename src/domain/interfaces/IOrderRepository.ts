import { Order, OrderStatus } from '../entities/Order.js';

export interface IOrderRepository {
  createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order>;
  findById(id: number): Promise<Order | null>;
  findByReservationId(reservationId: string): Promise<Order | null>;
  updateStatus(reservationIds: string[], currentStatus: OrderStatus, newStatus: OrderStatus): Promise<Order[]>;
  findExpiredReservations(olderThan: Date): Promise<Order[]>;
  markExpired(orderId: number): Promise<void>;
  updatePaymentIntent(orderIds: number[], paymentIntentId: string): Promise<void>;
}

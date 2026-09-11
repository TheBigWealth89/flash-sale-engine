import { Pool } from 'pg';
import { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import { Order, OrderStatus } from '../../domain/entities/Order.js';

export class PostgresOrderRepository implements IOrderRepository {
  constructor(private pool: Pool) {}

  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const query = `
      INSERT INTO orders (product_id, user_id, expires_at, reservation_id, amount, status) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [
      order.product_id, 
      order.user_id, 
      order.expires_at, 
      order.reservation_id, 
      order.amount,
      order.status
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id: number): Promise<Order | null> {
    const result = await this.pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  }

  async findByReservationId(reservationId: string): Promise<Order | null> {
    const result = await this.pool.query('SELECT * FROM orders WHERE reservation_id = $1', [reservationId]);
    return result.rows.length ? result.rows[0] : null;
  }

  async updateStatus(reservationIds: string[], currentStatus: OrderStatus, newStatus: OrderStatus): Promise<Order[]> {
    if (reservationIds.length === 0) return [];
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE reservation_id = ANY($2) AND status = $3
      RETURNING *`;
    const result = await this.pool.query(query, [newStatus, reservationIds, currentStatus]);
    return result.rows;
  }

  async findExpiredReservations(olderThan: Date): Promise<Order[]> {
    const query = `SELECT id, product_id, reservation_id FROM orders WHERE status = 'reserved' AND expires_at < $1 LIMIT 100`;
    const result = await this.pool.query(query, [olderThan]);
    return result.rows;
  }

  async markExpired(orderId: number): Promise<void> {
    await this.pool.query(`UPDATE orders SET status = 'expired', updated_at = NOW() WHERE id = $1`, [orderId]);
  }

  async updatePaymentIntent(orderIds: number[], paymentIntentId: string): Promise<void> {
    if (orderIds.length === 0) return;
    await this.pool.query(`UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = ANY($2::int[])`, [paymentIntentId, orderIds]);
  }
}

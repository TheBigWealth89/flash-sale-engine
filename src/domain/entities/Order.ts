export type OrderStatus = 'reserved' | 'payment_pending' | 'paid' | 'expired' | 'failed';

export interface Order {
  id: number;
  reservation_id: string;
  user_id: string;
  product_id: number;
  status: OrderStatus;
  stripe_payment_intent_id: string | null;
  amount: number;
  created_at: Date;
  expires_at: Date;
  updated_at: Date;
}

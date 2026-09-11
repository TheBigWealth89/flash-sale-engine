export interface ICartRepository {
  addToCart(userId: string, reservationEntry: string): Promise<void>;
  getCartItems(userId: string): Promise<string[]>;
  clearCart(userId: string): Promise<void>;
  validateCartCheckout(userId: string): Promise<{ validItems: string[]; expiredItems: string[] }>;
}

export interface IInventoryRepository {
  getInventory(productId: number): Promise<number | null>;
  decrementInventory(productId: number): Promise<number>;
  incrementInventory(productId: number): Promise<number>;
  setReservationHold(productId: number, userId: string, reservationId: string, ttlSeconds: number): Promise<void>;
  publishInventoryUpdate(productId: number, newInventory: number): Promise<void>;
}

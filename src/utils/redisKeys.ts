export const redisKey = {
  cartKey: (userId: string) => `cart:user-${userId}`,
  inventoryKey: (id: number) => `inventory:product-${id}`,
  cartEntry: (id: number, reservationId: string) => `${id}:rev-${reservationId}`,
  reservationKey: (id: number, userId: string, reservationId: string) =>
    `reservation:product:${id}:user-${userId}:rev-${reservationId}`,
};

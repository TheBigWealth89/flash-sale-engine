export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  inventory: number;
  created_at: Date;
}

import { Product } from '../entities/Product.js';

export interface IProductRepository {
  findById(id: number): Promise<Product | null>;
  findByIds(ids: number[]): Promise<Product[]>;
}

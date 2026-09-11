import { Pool } from 'pg';
import { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import { Product } from '../../domain/entities/Product.js';

export class PostgresProductRepository implements IProductRepository {
  constructor(private pool: Pool) {}

  async findById(id: number): Promise<Product | null> {
    const result = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  }

  async findByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const result = await this.pool.query('SELECT * FROM products WHERE id = ANY($1::int[])', [ids]);
    return result.rows;
  }
}

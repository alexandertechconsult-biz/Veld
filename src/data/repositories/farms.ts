import type { VeldDatabase } from '../db';
import type { Farm } from '../types';
import { createRepository, type Repository } from './base';

export type FarmsRepository = Repository<Farm>;

export function createFarmsRepository(database: VeldDatabase): FarmsRepository {
  return createRepository<Farm>(database.farms);
}

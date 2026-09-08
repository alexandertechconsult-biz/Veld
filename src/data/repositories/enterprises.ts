import type { VeldDatabase } from '../db';
import type { Enterprise, ID } from '../types';
import { createRepository, type Repository } from './base';

export interface EnterprisesRepository extends Repository<Enterprise> {
  listByFarm(farmId: ID): Promise<Enterprise[]>;
}

export function createEnterprisesRepository(database: VeldDatabase): EnterprisesRepository {
  const base = createRepository<Enterprise>(database.enterprises);
  return {
    ...base,
    listByFarm(farmId) {
      return database.enterprises.where('farmId').equals(farmId).toArray();
    },
  };
}

import type { VeldDatabase } from '../db';
import type { ID, LivestockRecord } from '../types';
import { createRepository, type Repository } from './base';

export interface LivestockRepository extends Repository<LivestockRecord> {
  listByEnterprise(enterpriseId: ID): Promise<LivestockRecord[]>;
}

export function createLivestockRepository(database: VeldDatabase): LivestockRepository {
  const base = createRepository<LivestockRecord>(database.livestock);
  return {
    ...base,
    listByEnterprise(enterpriseId) {
      return database.livestock.where('enterpriseId').equals(enterpriseId).toArray();
    },
  };
}

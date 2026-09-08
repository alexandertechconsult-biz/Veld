import type { VeldDatabase } from '../db';
import type { ID, Transaction } from '../types';
import { createRepository, type Repository } from './base';

export interface TransactionsRepository extends Repository<Transaction> {
  listByFarm(farmId: ID): Promise<Transaction[]>;
}

export function createTransactionsRepository(database: VeldDatabase): TransactionsRepository {
  const base = createRepository<Transaction>(database.transactions);
  return {
    ...base,
    listByFarm(farmId) {
      return database.transactions.where('farmId').equals(farmId).toArray();
    },
  };
}

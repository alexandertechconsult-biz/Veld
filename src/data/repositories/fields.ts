import type { VeldDatabase } from '../db';
import type { Field, ID } from '../types';
import { createRepository, type Repository } from './base';

export interface FieldsRepository extends Repository<Field> {
  listByEnterprise(enterpriseId: ID): Promise<Field[]>;
}

export function createFieldsRepository(database: VeldDatabase): FieldsRepository {
  const base = createRepository<Field>(database.fields);
  return {
    ...base,
    listByEnterprise(enterpriseId) {
      return database.fields.where('enterpriseId').equals(enterpriseId).toArray();
    },
  };
}

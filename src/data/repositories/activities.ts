import type { VeldDatabase } from '../db';
import type { Activity, ID } from '../types';
import { createRepository, mostRecentFirst, type Repository } from './base';

export interface ActivitiesRepository extends Repository<Activity> {
  /** Activities for one field, most recent first (E3-03). */
  listByField(fieldId: ID): Promise<Activity[]>;
}

export function createActivitiesRepository(database: VeldDatabase): ActivitiesRepository {
  const base = createRepository<Activity>(database.activities);
  return {
    ...base,
    async listByField(fieldId) {
      const rows = await database.activities.where('fieldId').equals(fieldId).toArray();
      return mostRecentFirst(rows);
    },
  };
}

import type { VeldDatabase } from '../db';
import type { ID, Task } from '../types';
import { createRepository, type Repository } from './base';

export interface TasksRepository extends Repository<Task> {
  listByFarm(farmId: ID): Promise<Task[]>;
}

export function createTasksRepository(database: VeldDatabase): TasksRepository {
  const base = createRepository<Task>(database.tasks);
  return {
    ...base,
    listByFarm(farmId) {
      return database.tasks.where('farmId').equals(farmId).toArray();
    },
  };
}

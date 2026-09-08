// Public entry point for the data layer. Every module reads and writes farm
// data through the repositories exposed here — never through Dexie directly.

import { db, VeldDatabase } from './db';
import { createFarmsRepository } from './repositories/farms';
import { createEnterprisesRepository } from './repositories/enterprises';
import { createLivestockRepository } from './repositories/livestock';
import { createFieldsRepository } from './repositories/fields';
import { createEventsRepository } from './repositories/events';
import { createActivitiesRepository } from './repositories/activities';
import { createTasksRepository } from './repositories/tasks';
import { createTransactionsRepository } from './repositories/transactions';

export * from './types';
export { VeldDatabase, db } from './db';

/** The full set of typed repositories bound to one database instance. */
export function createRepositories(database: VeldDatabase) {
  return {
    farms: createFarmsRepository(database),
    enterprises: createEnterprisesRepository(database),
    livestock: createLivestockRepository(database),
    fields: createFieldsRepository(database),
    events: createEventsRepository(database),
    activities: createActivitiesRepository(database),
    tasks: createTasksRepository(database),
    transactions: createTransactionsRepository(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

/** App-wide repositories, bound to the singleton database. */
export const repositories: Repositories = createRepositories(db);

import type { VeldDatabase } from '../db';
import type { Event, ID } from '../types';
import { createRepository, mostRecentFirst, type Repository } from './base';

export interface EventsRepository extends Repository<Event> {
  /** Events for one animal or group, most recent first (E2-03). */
  listByLivestock(livestockId: ID): Promise<Event[]>;
}

export function createEventsRepository(database: VeldDatabase): EventsRepository {
  const base = createRepository<Event>(database.events);
  return {
    ...base,
    async listByLivestock(livestockId) {
      const rows = await database.events.where('livestockId').equals(livestockId).toArray();
      return mostRecentFirst(rows);
    },
  };
}

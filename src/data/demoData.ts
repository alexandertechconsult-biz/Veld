// Demo farm seed data (E8-01). A pre-populated mixed crop-and-livestock farm so
// Barrett can show the concept without the farmer's real data (BACKLOG.md
// Section 13 demo flow). Pure of any DOM or singleton — the repositories are
// injected — so it is unit-testable against a fresh database and reused by the
// first-run loader at the composition root, exactly like the other domain
// modules (farmProfile, enterprises).
//
// Seeds into an empty install only: MVP is one farm per device (Section 5), so
// seeding refuses when a farm already exists rather than creating a second farm
// or destroying real data. Barrett re-demos from a fresh install or by clearing
// site data. `now` is injected rather than read from the clock so event dates
// are deterministic in tests, matching the backup module's `exportedAt`.
//
// Scope note (surfaced for review): the acceptance criteria name a sample
// enterprise, several animals and fields, and a few days of events. Tasks and
// transactions are seeded too because the demo flow this ticket exists to serve
// (Section 13 — open tasks on Home, the Financials running total) is not
// demonstrable without them.

import { loadCurrentFarm } from './farmProfile';
import type { Repositories } from './index';
import type {
  ActivityType,
  EnterpriseType,
  EventType,
  ID,
  LivestockRecord,
  Field,
  TransactionType,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Raised when seeding is attempted on a device that already has a farm, so the
 *  loader can tell Barrett the demo only loads into an empty install. */
export class DemoDataExistsError extends Error {
  constructor() {
    super('This device already has a farm. The demo farm only loads on a fresh install.');
    this.name = 'DemoDataExistsError';
  }
}

/** Blueprint shapes: plain data describing the demo farm, kept separate from the
 *  write logic so the content reads at a glance and links are by index. */
interface DemoAnimal {
  name: string;
  species: string;
  count: number;
  notes?: string;
}
interface DemoField {
  name: string;
  cropType: string;
  size?: string;
}
interface DemoEvent {
  animal: number;
  daysAgo: number;
  type: EventType;
  note: string;
}
interface DemoActivity {
  field: number;
  daysAgo: number;
  type: ActivityType;
  note: string;
}
interface DemoTask {
  title: string;
  assignee?: string;
  dueInDays?: number;
  done?: boolean;
}
interface DemoTransaction {
  enterprise: EnterpriseType | null;
  type: TransactionType;
  amount: number;
  daysAgo: number;
  note: string;
}

const DEMO_FARM_NAME = 'Rietvlei Mixed Farm';
const DEMO_LIVESTOCK_ENTERPRISE = 'Cattle & Sheep';
const DEMO_CROP_ENTERPRISE = 'Maize & Lucerne';

const DEMO_ANIMALS: DemoAnimal[] = [
  { name: 'Cow 042', species: 'Cattle', count: 1 },
  { name: 'Cow 118', species: 'Cattle', count: 1 },
  { name: 'Weaner batch', species: 'Cattle', count: 24 },
  { name: 'Dorper flock', species: 'Sheep', count: 60 },
];

const DEMO_FIELDS: DemoField[] = [
  { name: 'North Field', cropType: 'Maize', size: '18 ha' },
  { name: 'River Block', cropType: 'Maize', size: '12 ha' },
  { name: 'Home Paddock', cropType: 'Lucerne', size: '4 ha' },
];

const DEMO_EVENTS: DemoEvent[] = [
  { animal: 0, daysAgo: 4, type: 'health', note: 'Treated for redwater, gave Terramycin' },
  { animal: 2, daysAgo: 3, type: 'movement', note: 'Moved to the north grazing camp' },
  { animal: 1, daysAgo: 2, type: 'weight', note: 'Weighed 465 kg at the crush' },
  { animal: 3, daysAgo: 1, type: 'health', note: 'Dosed the flock for wireworm' },
  { animal: 0, daysAgo: 0, type: 'movement', note: 'Brought back to the home kraal' },
];

const DEMO_ACTIVITIES: DemoActivity[] = [
  { field: 2, daysAgo: 4, type: 'planting', note: 'Over-seeded lucerne after the rain' },
  { field: 0, daysAgo: 3, type: 'input', note: 'Sprayed for fall armyworm' },
  { field: 1, daysAgo: 2, type: 'harvest', note: 'Started silage cutting, six rows done' },
];

const DEMO_TASKS: DemoTask[] = [
  { title: 'Fix the fence on the north camp', assignee: 'Sipho', dueInDays: 2 },
  { title: 'Order lick for the weaners' },
  { title: 'Book the vet for pregnancy testing', assignee: 'Thabo', dueInDays: 5 },
  { title: 'Service the boom sprayer', done: true },
];

const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { enterprise: 'livestock', type: 'cost', amount: 3200, daysAgo: 4, note: 'Terramycin and dip chemicals' },
  { enterprise: 'crop', type: 'cost', amount: 8500, daysAgo: 3, note: 'Fall armyworm spray' },
  { enterprise: 'livestock', type: 'sale', amount: 42000, daysAgo: 1, note: 'Sold three weaners at the auction' },
  { enterprise: null, type: 'cost', amount: 1500, daysAgo: 0, note: 'Diesel for the bakkie' },
];

/** Counts of what was written, for the loader's confirmation copy. */
export interface DemoSeedSummary {
  livestock: number;
  fields: number;
  events: number;
  activities: number;
  tasks: number;
  transactions: number;
}

/**
 * Seeds the demo farm into an empty install. Refuses (throws
 * `DemoDataExistsError`) if a farm already exists, so it can never create a
 * second farm or clobber real data. Writes run sequentially through the injected
 * repositories — the same non-atomic multi-write pattern the app uses elsewhere
 * (e.g. cascade deletes); a failure part-way is recoverable by clearing site
 * data, and is not a concern for known-good local seed data.
 */
export async function seedDemoData(repos: Repositories, now: number): Promise<DemoSeedSummary> {
  if (await loadCurrentFarm(repos)) {
    throw new DemoDataExistsError();
  }

  const farm = await repos.farms.create({ name: DEMO_FARM_NAME });
  const livestockEnterprise = await repos.enterprises.create({
    farmId: farm.id,
    type: 'livestock',
    name: DEMO_LIVESTOCK_ENTERPRISE,
  });
  const cropEnterprise = await repos.enterprises.create({
    farmId: farm.id,
    type: 'crop',
    name: DEMO_CROP_ENTERPRISE,
  });

  const animals: LivestockRecord[] = [];
  for (const animal of DEMO_ANIMALS) {
    animals.push(
      await repos.livestock.create({
        enterpriseId: livestockEnterprise.id,
        name: animal.name,
        species: animal.species,
        count: animal.count,
        ...(animal.notes ? { notes: animal.notes } : {}),
      }),
    );
  }

  const fields: Field[] = [];
  for (const field of DEMO_FIELDS) {
    fields.push(
      await repos.fields.create({
        enterpriseId: cropEnterprise.id,
        name: field.name,
        cropType: field.cropType,
        ...(field.size ? { size: field.size } : {}),
      }),
    );
  }

  for (const event of DEMO_EVENTS) {
    await repos.events.create({
      livestockId: animals[event.animal].id,
      date: now - event.daysAgo * DAY_MS,
      type: event.type,
      note: event.note,
    });
  }

  for (const activity of DEMO_ACTIVITIES) {
    await repos.activities.create({
      fieldId: fields[activity.field].id,
      date: now - activity.daysAgo * DAY_MS,
      type: activity.type,
      note: activity.note,
    });
  }

  for (const task of DEMO_TASKS) {
    await repos.tasks.create({
      farmId: farm.id,
      title: task.title,
      status: task.done ? 'done' : 'open',
      ...(task.assignee ? { assignee: task.assignee } : {}),
      ...(task.dueInDays !== undefined ? { dueDate: now + task.dueInDays * DAY_MS } : {}),
    });
  }

  const enterpriseId: Record<EnterpriseType, ID> = {
    livestock: livestockEnterprise.id,
    crop: cropEnterprise.id,
  };
  for (const transaction of DEMO_TRANSACTIONS) {
    await repos.transactions.create({
      farmId: farm.id,
      type: transaction.type,
      amount: transaction.amount,
      date: now - transaction.daysAgo * DAY_MS,
      note: transaction.note,
      ...(transaction.enterprise ? { enterpriseId: enterpriseId[transaction.enterprise] } : {}),
    });
  }

  return {
    livestock: DEMO_ANIMALS.length,
    fields: DEMO_FIELDS.length,
    events: DEMO_EVENTS.length,
    activities: DEMO_ACTIVITIES.length,
    tasks: DEMO_TASKS.length,
    transactions: DEMO_TRANSACTIONS.length,
  };
}

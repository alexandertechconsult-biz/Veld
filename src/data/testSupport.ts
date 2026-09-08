import { VeldDatabase } from './db';
import { createRepositories, type Repositories } from './index';

/**
 * A fresh, isolated database plus its repositories for one test. Each call uses
 * a unique db name so tests never share state; `dispose` deletes it afterwards.
 */
export interface TestContext {
  db: VeldDatabase;
  repos: Repositories;
  dispose(): Promise<void>;
}

let counter = 0;

export function freshContext(): TestContext {
  counter += 1;
  const database = new VeldDatabase(`veld-test-${counter}`);
  return {
    db: database,
    repos: createRepositories(database),
    dispose: () => database.delete(),
  };
}

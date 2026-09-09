import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  InvalidAmountError,
  InvalidTransactionDateError,
  InvalidTransactionTypeError,
  NoFarmForTransactionError,
  TransactionEnterpriseNotFoundError,
  addTransaction,
  listTransactions,
} from './transactions';
import type { TransactionType } from './types';
import { addEnterprise } from './enterprises';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

/** Seed the farm and one enterprise, returning the enterprise id. */
async function seedEnterprise(): Promise<string> {
  await saveFarmProfile(ctx.repos, 'Rooikraal');
  const enterprise = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
  return enterprise.id;
}

describe('addTransaction', () => {
  it('logs a cost from type, amount and date', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const tx = await addTransaction(ctx.repos, {
      type: 'cost',
      amount: 1500,
      date: Date.UTC(2026, 8, 1),
    });

    expect(tx.type).toBe('cost');
    expect(tx.amount).toBe(1500);
    expect(tx.date).toBe(Date.UTC(2026, 8, 1));
    expect(tx.enterpriseId).toBeUndefined();
    expect(tx.note).toBeUndefined();
    expect(await ctx.repos.transactions.getAll()).toHaveLength(1);
  });

  it('logs a sale', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const tx = await addTransaction(ctx.repos, {
      type: 'sale',
      amount: 42000,
      date: Date.UTC(2026, 8, 2),
    });
    expect(tx.type).toBe('sale');
  });

  it('stores an optional enterprise link when supplied', async () => {
    const enterpriseId = await seedEnterprise();
    const tx = await addTransaction(ctx.repos, {
      type: 'cost',
      amount: 300,
      date: Date.UTC(2026, 8, 1),
      enterpriseId,
    });
    expect(tx.enterpriseId).toBe(enterpriseId);
  });

  it('stores and trims an optional note', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const tx = await addTransaction(ctx.repos, {
      type: 'sale',
      amount: 300,
      date: Date.UTC(2026, 8, 1),
      note: '  Weaner calves  ',
    });
    expect(tx.note).toBe('Weaner calves');
  });

  it('omits a blank note rather than storing an empty string', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const tx = await addTransaction(ctx.repos, {
      type: 'cost',
      amount: 300,
      date: Date.UTC(2026, 8, 1),
      note: '   ',
    });
    expect(tx.note).toBeUndefined();
  });

  it('rejects an unknown type without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, {
        type: 'gift' as TransactionType,
        amount: 100,
        date: Date.UTC(2026, 8, 1),
      }),
    ).rejects.toBeInstanceOf(InvalidTransactionTypeError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects a zero amount without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, { type: 'cost', amount: 0, date: Date.UTC(2026, 8, 1) }),
    ).rejects.toBeInstanceOf(InvalidAmountError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects a negative amount without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, { type: 'cost', amount: -5, date: Date.UTC(2026, 8, 1) }),
    ).rejects.toBeInstanceOf(InvalidAmountError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects a non-finite amount without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, { type: 'cost', amount: Number.NaN, date: Date.UTC(2026, 8, 1) }),
    ).rejects.toBeInstanceOf(InvalidAmountError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects logging before a farm exists without writing', async () => {
    await expect(
      addTransaction(ctx.repos, { type: 'cost', amount: 100, date: Date.UTC(2026, 8, 1) }),
    ).rejects.toBeInstanceOf(NoFarmForTransactionError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects a non-finite date without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, { type: 'cost', amount: 100, date: Number.NaN }),
    ).rejects.toBeInstanceOf(InvalidTransactionDateError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('rejects a link to an enterprise that does not exist without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTransaction(ctx.repos, {
        type: 'cost',
        amount: 100,
        date: Date.UTC(2026, 8, 1),
        enterpriseId: 'ghost',
      }),
    ).rejects.toBeInstanceOf(TransactionEnterpriseNotFoundError);
    expect(await ctx.repos.transactions.getAll()).toHaveLength(0);
  });

  it('survives a close and reopen of the database', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await addTransaction(ctx.repos, { type: 'sale', amount: 999, date: Date.UTC(2026, 8, 1) });

    ctx.db.close();
    await ctx.db.open();

    const list = await listTransactions(ctx.repos);
    expect(list).toHaveLength(1);
    expect(list[0].amount).toBe(999);
  });
});

describe('listTransactions', () => {
  it('is empty when no farm exists yet', async () => {
    expect(await listTransactions(ctx.repos)).toEqual([]);
  });

  it('returns the farm transactions most recent first', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await addTransaction(ctx.repos, { type: 'cost', amount: 1, date: Date.UTC(2026, 0, 1) });
    await addTransaction(ctx.repos, { type: 'sale', amount: 2, date: Date.UTC(2026, 5, 1) });
    await addTransaction(ctx.repos, { type: 'cost', amount: 3, date: Date.UTC(2026, 2, 1) });

    const list = await listTransactions(ctx.repos);
    expect(list.map((tx) => tx.amount)).toEqual([2, 3, 1]);
  });

  it('breaks a same-date tie by most-recently-created first', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const sameDate = Date.UTC(2026, 3, 1);
    await addTransaction(ctx.repos, { type: 'cost', amount: 10, date: sameDate });
    await addTransaction(ctx.repos, { type: 'cost', amount: 20, date: sameDate });

    const list = await listTransactions(ctx.repos);
    expect(list.map((tx) => tx.amount)).toEqual([20, 10]);
  });
});

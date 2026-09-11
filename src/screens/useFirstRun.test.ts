import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFirstRun } from './useFirstRun';
import { db } from '../data';

// useFirstRun talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('useFirstRun', () => {
  it('reports the flow is needed when no farm exists yet', async () => {
    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => expect(result.current.status).toBe('needed'));
  });

  it('reports complete when a farm already exists, so the flow never shows', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });

    const { result } = renderHook(() => useFirstRun());

    await waitFor(() => expect(result.current.status).toBe('complete'));
  });

  it('createFarm persists the farm and resolves true', async () => {
    const { result } = renderHook(() => useFirstRun());
    await waitFor(() => expect(result.current.status).toBe('needed'));

    let saved = false;
    await act(async () => {
      saved = await result.current.createFarm('Rooikraal Farm');
    });

    expect(saved).toBe(true);
    const farms = await db.farms.toArray();
    expect(farms).toHaveLength(1);
    expect(farms[0]?.name).toBe('Rooikraal Farm');
  });

  it('createFarm rejects a blank name without writing, and reports the error', async () => {
    const { result } = renderHook(() => useFirstRun());
    await waitFor(() => expect(result.current.status).toBe('needed'));

    let saved = true;
    await act(async () => {
      saved = await result.current.createFarm('   ');
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('Enter a farm name.');
    expect(await db.farms.toArray()).toHaveLength(0);
  });

  it('addFirstEnterprise persists the enterprise once the farm exists', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
    const { result } = renderHook(() => useFirstRun());
    await waitFor(() => expect(result.current.status).toBe('complete'));

    let saved = false;
    await act(async () => {
      saved = await result.current.addFirstEnterprise('Beef herd', 'livestock');
    });

    expect(saved).toBe(true);
    const enterprises = await db.enterprises.toArray();
    expect(enterprises).toHaveLength(1);
    expect(enterprises[0]).toMatchObject({ name: 'Beef herd', type: 'livestock' });
  });

  it('loadDemo seeds a demo farm and completes the flow', async () => {
    const { result } = renderHook(() => useFirstRun());
    await waitFor(() => expect(result.current.status).toBe('needed'));

    let seeded = false;
    await act(async () => {
      seeded = await result.current.loadDemo();
    });

    expect(seeded).toBe(true);
    expect(result.current.status).toBe('complete');
    // The demo farm and its records were written to the singleton database.
    expect(await db.farms.toArray()).toHaveLength(1);
    expect((await db.livestock.toArray()).length).toBeGreaterThan(0);
    expect((await db.fields.toArray()).length).toBeGreaterThan(0);
  });

  it('loadDemo refuses when a farm already exists, reporting a readable error', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'My Real Farm' });
    const { result } = renderHook(() => useFirstRun());
    await waitFor(() => expect(result.current.status).toBe('complete'));

    let seeded = true;
    await act(async () => {
      seeded = await result.current.loadDemo();
    });

    expect(seeded).toBe(false);
    expect(result.current.error).toContain('fresh install');
    // The real farm is untouched; no demo enterprises were added.
    expect(await db.enterprises.toArray()).toHaveLength(0);
    expect((await db.farms.toArray())[0]?.name).toBe('My Real Farm');
  });
});

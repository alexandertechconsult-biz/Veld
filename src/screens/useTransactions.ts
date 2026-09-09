import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, Transaction } from '../data';
import { loadCurrentFarm } from '../data/farmProfile';
import { listEnterprises } from '../data/enterprises';
import {
  InvalidAmountError,
  InvalidTransactionDateError,
  InvalidTransactionTypeError,
  NoFarmForTransactionError,
  TransactionEnterpriseNotFoundError,
  addTransaction,
  listTransactions,
  type NewTransaction,
} from '../data/transactions';

/** UI state for the financials module: exactly one thing is true at a time. */
export type FinancialsStatus =
  | { kind: 'loading' }
  | { kind: 'no-farm' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/** Known transaction errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof InvalidAmountError ||
    error instanceof InvalidTransactionDateError ||
    error instanceof InvalidTransactionTypeError ||
    error instanceof NoFarmForTransactionError ||
    error instanceof TransactionEnterpriseNotFoundError
    ? error.message
    : fallback;
}

/**
 * Owns the current farm's transactions and the enterprises one can be linked to,
 * plus the log operation, wiring the pure `data/transactions` logic to the
 * app-wide repositories. The component stays presentational; persistence is here.
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [status, setStatus] = useState<FinancialsStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const farm = await loadCurrentFarm(repositories);
        if (!farm) {
          if (active) setStatus({ kind: 'no-farm' });
          return;
        }
        const [list, options] = await Promise.all([
          listTransactions(repositories),
          listEnterprises(repositories),
        ]);
        if (!active) return;
        setTransactions(list);
        setEnterprises(options);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your financials. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Returns true when the transaction was logged, so the form can clear itself. */
  const logTransaction = useCallback(async (input: NewTransaction): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await addTransaction(repositories, input);
      setTransactions(await listTransactions(repositories));
      setStatus({ kind: 'saved', message: 'Transaction logged.' });
      return true;
    } catch (error) {
      setStatus({
        kind: 'error',
        message: messageFor(error, 'Could not log the transaction. Please try again.'),
      });
      return false;
    }
  }, []);

  return { transactions, enterprises, status, logTransaction };
}

import { useState, type FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import type { Enterprise, Transaction, TransactionType } from '../data';
import { TRANSACTION_TYPES } from '../data/transactions';
import { useTransactions } from './useTransactions';

/** Today as an ISO date string (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Human label for a transaction type, from the single TRANSACTION_TYPES source. */
function typeLabel(type: TransactionType): string {
  return TRANSACTION_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

/** The one-line summary under a transaction: date, optional enterprise and note. */
function metaLine(tx: Transaction, enterprises: Enterprise[]): string {
  const parts: string[] = [new Date(tx.date).toLocaleDateString()];
  const linked = tx.enterpriseId
    ? enterprises.find((enterprise) => enterprise.id === tx.enterpriseId)?.name
    : undefined;
  if (linked) parts.push(linked);
  if (tx.note) parts.push(tx.note);
  return parts.join(' · ');
}

/**
 * Financials module. Log a cost or sale (E5-01) — a type, amount and date, with
 * an optional link to an enterprise and a note — and see the farm's transactions
 * as a running list, most recent first. A running total (E5-02) and edit/delete
 * (E5-03) are later, gated tickets.
 */
export default function FinancialsScreen() {
  const navigate = useNavigate();
  const { transactions, enterprises, status, logTransaction } = useTransactions();

  const [type, setType] = useState<TransactionType>('cost');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [enterpriseId, setEnterpriseId] = useState('');
  const [note, setNote] = useState('');

  if (status.kind === 'loading') {
    return (
      <p className="settings-status" role="status">
        Loading…
      </p>
    );
  }

  // No farm means there is nothing to log a cost or sale against yet.
  if (status.kind === 'no-farm') {
    return (
      <EmptyState
        icon={Wallet}
        message="No farm yet. Set up your farm in Settings, then log your costs and sales."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  const saving = status.kind === 'saving';
  const parsedAmount = Number(amount);
  const canSubmit = !saving && amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const logged = await logTransaction({
      type,
      amount: Number(amount),
      // An empty date input is guarded by the disabled submit, but fall back to today.
      date: date ? new Date(date).getTime() : Date.now(),
      ...(enterpriseId ? { enterpriseId } : {}),
      note,
    });
    if (logged) {
      setType('cost');
      setAmount('');
      setDate(today());
      setEnterpriseId('');
      setNote('');
    }
  }

  return (
    <section className="module" aria-labelledby="financials-heading">
      <h2 id="financials-heading" className="module__title">
        Financials
      </h2>
      <p className="module__hint">
        Log a cost or sale with an amount and date. Optionally link it to an enterprise and add a
        note.
      </p>

      {transactions.length === 0 ? (
        <p className="settings-status">No costs or sales yet. Log your first below.</p>
      ) : (
        <ul className="record-list" aria-label="Transactions">
          {transactions.map((tx) => (
            <li className="record-row" key={tx.id}>
              <div className="record-row__main">
                <div className="record-row__text">
                  <span className="record-row__name">
                    {typeLabel(tx.type)} · {tx.amount.toLocaleString()}
                  </span>
                  <span className="record-row__meta">{metaLine(tx, enterprises)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="farm-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Type</span>
          <select
            className="field__input"
            value={type}
            onChange={(event) => setType(event.target.value as TransactionType)}
            disabled={saving}
            data-testid="transaction-type-select"
          >
            {TRANSACTION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Amount</span>
          <input
            className="field__input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 1500"
            autoComplete="off"
            disabled={saving}
            data-testid="transaction-amount-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Date</span>
          <input
            className="field__input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={saving}
            data-testid="transaction-date-input"
          />
        </label>

        {enterprises.length > 0 ? (
          <label className="field">
            <span className="field__label">Enterprise (optional)</span>
            <select
              className="field__input"
              value={enterpriseId}
              onChange={(event) => setEnterpriseId(event.target.value)}
              disabled={saving}
              data-testid="transaction-enterprise-select"
            >
              <option value="">Farm-level (no enterprise)</option>
              {enterprises.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {enterprise.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span className="field__label">Note (optional)</span>
          <textarea
            className="field__input event-form__note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Diesel for the tractor"
            rows={3}
            disabled={saving}
            data-testid="transaction-note-input"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Log transaction
        </button>
      </form>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'saved' ? (
        <p className="settings-status settings-status--success" role="status">
          {status.message}
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import type { Enterprise, TransactionType } from '../data';
import { TRANSACTION_TYPES } from '../data/transactions';
import type { NewTransaction } from '../data/transactions';
import type { QuickAddStatus } from './useQuickAdd';

interface QuickTransactionFormProps {
  enterprises: Enterprise[];
  status: QuickAddStatus;
  /** Returns true when the transaction saved, so the sheet can close. */
  onLog: (input: NewTransaction) => Promise<boolean>;
  onCancel: () => void;
}

/** Today as an ISO date string (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compact cost/sale form for the Home quick-add sheet (E7-02). Type, amount and
 * date, with an optional enterprise link and note — the same fields as the
 * Financials screen, sized for a three-tap capture. Persistence lives in
 * `useQuickAdd`; this only collects and shapes input.
 */
export default function QuickTransactionForm({
  enterprises,
  status,
  onLog,
  onCancel,
}: QuickTransactionFormProps) {
  const [type, setType] = useState<TransactionType>('cost');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [enterpriseId, setEnterpriseId] = useState('');
  const [note, setNote] = useState('');

  const saving = status.kind === 'saving';
  const parsedAmount = Number(amount);
  const canSubmit =
    !saving && amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLog({
      type,
      amount: Number(amount),
      date: date ? new Date(date).getTime() : Date.now(),
      ...(enterpriseId ? { enterpriseId } : {}),
      note,
    });
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label="Log a cost or sale">
      <label className="field">
        <span className="field__label">Type</span>
        <select
          className="field__input"
          value={type}
          onChange={(event) => setType(event.target.value as TransactionType)}
          disabled={saving}
          data-testid="quick-transaction-type-select"
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
          data-testid="quick-transaction-amount-input"
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
          data-testid="quick-transaction-date-input"
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
            data-testid="quick-transaction-enterprise-select"
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
          data-testid="quick-transaction-note-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Back
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Log transaction
        </button>
      </div>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { usePick } from '../../i18n/language.ts';
import { ApiError, voidEntry, type Entry } from './api.ts';
import { Dialog, FormError, inputClass } from './Dialog.tsx';
import { KIND_LABELS, ago } from './format.ts';
import { d } from './i18n.ts';

const MAX_REASON = 200;

/** Asks for a reason, then withdraws the entry. The reason starts as "Test entry", selected, so typing replaces it. */
export function WithdrawDialog({
  entry,
  boatName,
  onClose,
  onDone,
}: {
  entry: Entry;
  boatName: string;
  onClose: () => void;
  onDone: (entry: Entry, reason: string) => void;
}) {
  const pick = usePick();
  const [reason, setReason] = useState(() => d('withdrawSuggestion').en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Dialog focuses the field on open; select it so the suggestion is easy to replace.
  useEffect(() => {
    const id = requestAnimationFrame(() => input.current?.select());
    return () => cancelAnimationFrame(id);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    if (!text) return setError('Enter a reason, for example “Test entry”.');
    setBusy(true);
    setError(null);
    try {
      const { entry: next } = await voidEntry(entry.id, text);
      onDone(next, text);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'The server did not accept your PIN. Sign out and sign in again.'
          : err instanceof ApiError && err.status === 404
            ? 'This server cannot withdraw entries yet, or the entry is gone. Refresh and try again.'
            : (err as Error).message,
      );
      setBusy(false);
    }
  }

  const title = d('withdrawTitle');
  const fill = (s: string) => s.replace('{boat}', boatName);
  const summary = [KIND_LABELS[entry.kind], entry.quantity, ago(entry.at)].filter(Boolean).join(' · ');

  return (
    <Dialog title={{ en: fill(title.en), ml: fill(title.ml) }} subtitle={summary} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Bi as="p" text={d('withdrawBody')} className="text-small text-ink" mlClassName="mt-1 text-ink-muted" />
        <label className="block">
          <Bi text={d('withdrawReason')} className="mb-1.5 block text-small font-semibold text-ink" />
          <input
            ref={input}
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            required
            autoComplete="off"
            enterKeyHint="done"
          />
          <Bi text={d('withdrawReasonHint')} className="mt-1 block text-caption text-ink-muted" />
        </label>
        <FormError message={error} />
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {pick(d('cancel'))}
          </Button>
          <Button type="submit" busy={busy} disabled={!reason.trim()} className="bg-teak! text-ink-inverse! shadow-none hover:bg-teak-raised!">
            {pick(d('withdraw'))}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

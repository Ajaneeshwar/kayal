import { useState, type FormEvent } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { usePick } from '../../i18n/language.ts';
import { fill } from '../boat/data.ts';
import { ApiError, callOwner, type Boat, type CallLanguage, type Facility, type ReminderCall, type ReminderResult } from './api.ts';
import { Dialog, FormError } from './Dialog.tsx';
import { d } from './i18n.ts';

const DAY_MS = 86_400_000;
/** The server calls a boat "due soon" inside the last 14 days before its pump-out falls due. */
const DUE_SOON_DAYS = 14;

/** True for a boat that is overdue or falls due within 14 days, the boats worth a reminder call. */
export function callDue(boat: Boat, now = Date.now()) {
  const last = boat.status.lastSewage;
  if (!last) return true;
  return Date.parse(last.at) + boat.status.overdueDays * DAY_MS - now <= DUE_SOON_DAYS * DAY_MS;
}

const dueDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

/**
 * The English reminder, built from the same boat data as `reminderMessage` in lib/logic.mjs. Only
 * the server knows the owner's name, so the preview greets without it.
 */
function previewMessage(boat: Boat, facilities: Facility[], now = Date.now()) {
  let timing = `${boat.name} has no sewage pump-out on record.`;
  const last = boat.status.lastSewage;
  if (last) {
    const dueAt = Date.parse(last.at) + boat.status.overdueDays * DAY_MS;
    const left = dueAt - now;
    const days = Math.ceil(Math.abs(left) / DAY_MS);
    const period = `${days} ${days === 1 ? 'day' : 'days'}`;
    const expiry = left < 0 ? `is ${period} overdue` : `expires ${days === 0 ? 'today' : `in ${period}`} (${dueDate.format(dueAt)})`;
    timing = `${boat.name}'s ${boat.status.overdueDays}-day sewage pump-out record ${expiry}.`;
  }
  const plant = facilities.find((f) => f.open && f.accepts.includes('sewage'));
  const destination = plant ? `${plant.name} or another approved plant` : 'an approved treatment plant';
  return `Hello, this is Kayal Log's automated Alappuzha houseboat reminder. ${timing} Empty the toilet tank at ${destination} and log it in Kayal Log. Delays may affect licence renewal. Thank you.`;
}

export function PhoneIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.2 2.2h2.4l1.2 3-1.6 1.1a8 8 0 0 0 4.5 4.5l1.1-1.6 3 1.2v2.4a1.3 1.3 0 0 1-1.4 1.3A11.7 11.7 0 0 1 1.9 3.6a1.3 1.3 0 0 1 1.3-1.4z" />
    </svg>
  );
}

/** Confirms the call, places it, then shows the masked number it rang. */
export function CallOwnerDialog({
  boat,
  facilities,
  onClose,
  onCalled,
}: {
  boat: Boat;
  facilities: Facility[];
  onClose: () => void;
  onCalled: (call: ReminderCall) => void;
}) {
  const pick = usePick();
  const [language, setLanguage] = useState<CallLanguage>('Malayalam');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReminderResult | null>(null);

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await callOwner(boat.id, language);
      setResult(res);
      onCalled({ boatId: boat.id, at: new Date().toISOString(), attemptId: res.attemptId, language: res.language, to: res.to });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      const wait = err instanceof ApiError ? err.retryAfterSeconds : null;
      setError(
        status === 429
          ? pick(d('callWait')).replace('{seconds}', String(wait ?? 60))
          : status === 503
            ? pick(d('callNotSetUp'))
            : status === 502
              ? pick(d('callFailed'))
              : status === 401
                ? 'The server did not accept your PIN. Sign out and sign in again.'
                : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }

  const message = result?.message.english ?? previewMessage(boat, facilities);

  return (
    <Dialog title={fill(d('callTitle'), { boat: boat.name })} subtitle={boat.registration} onClose={onClose}>
      <form onSubmit={start} className="space-y-5">
        {result ? (
          <div role="status" className="flex items-start gap-3 rounded-control bg-surface px-4 py-3.5 ring-1 ring-line">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gold-ink text-kasavu">
              <PhoneIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <Bi
                text={fill(d('callCalling'), { number: result.to })}
                className="font-semibold tabular-nums text-ink"
                mlClassName="mt-0.5 font-medium text-ink-muted"
              />
              <Bi text={d('callCallingBody')} className="mt-1 text-small text-ink-muted" />
            </div>
          </div>
        ) : (
          <Bi as="p" text={d('callBody')} className="text-small text-ink" mlClassName="mt-1 text-ink-muted" />
        )}

        <div>
          <Bi text={d('callMessage')} className="mb-1.5 block text-small font-semibold text-ink" />
          <blockquote lang="en" className="rounded-control border-s-2 border-gold-edge bg-surface px-4 py-3 text-small text-ink">
            {message}
          </blockquote>
          {!result && <Bi text={d('callMessageNote')} className="mt-1.5 block text-caption text-ink-muted" />}
        </div>

        {!result && (
          <fieldset>
            <legend className="mb-1.5 text-small font-semibold text-ink">
              <Bi text={d('callLanguage')} />
            </legend>
            <div className="inline-flex gap-1 rounded-control border border-field-border p-1">
              {(['Malayalam', 'English'] as const).map((value) => (
                <label
                  key={value}
                  className={`relative inline-flex min-h-10 cursor-pointer items-center rounded-[0.625rem] px-4 text-small font-semibold transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
                    language === value ? 'bg-gold-ink text-kasavu' : 'text-ink hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="call-language"
                    value={value}
                    checked={language === value}
                    onChange={() => setLanguage(value)}
                    className="sr-only"
                  />
                  <Bi text={d(value === 'Malayalam' ? 'callMalayalam' : 'callEnglish')} layout="inline" />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <FormError message={error} />

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          {result ? (
            <Button onClick={onClose}>{pick(d('callDone'))}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                {pick(d('cancel'))}
              </Button>
              <Button type="submit" busy={busy}>
                <PhoneIcon className="size-4" />
                {pick(d('callStart'))}
              </Button>
            </>
          )}
        </div>
      </form>
    </Dialog>
  );
}

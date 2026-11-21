import { useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError, correctQuantity, formatDistance, type Entry, type Kind, type Level } from './api.ts';
import { t } from './i18n.ts';
import { usePick } from '../../i18n/language.ts';
import type { CrewKey } from './strings.ts';
import { Icon, MlEn } from './ui.tsx';

const KIND: Record<Kind, CrewKey> = {
  sewage_pumpout: 'kindSewage',
  solid_waste: 'kindSolid',
  engine_oil: 'kindOil',
};

const LEVEL: Record<Level, { key: CrewKey; className: string }> = {
  declared: { key: 'levelDeclared', className: 'bg-declared-soft text-declared' },
  location: { key: 'levelLocation', className: 'bg-verified-soft text-verified' },
  receipt: { key: 'levelReceipt', className: 'bg-verified-soft text-verified' },
};

function reasonKey(entry: Entry): CrewKey {
  const { level, reason } = entry.verification;
  if (level === 'receipt') return 'reasonReceipt';
  if (level === 'location') return 'reasonLocation';
  if (reason === 'no_facility') return 'reasonNoFacility';
  if (reason === 'too_far') return 'reasonTooFar';
  if (reason === 'closed') return 'reasonClosed';
  return 'reasonNoLocation';
}

const DEFAULT_UNIT: Record<Kind, string> = { sewage_pumpout: 'litres', solid_waste: 'bags', engine_oil: 'litres' };

/** Splits "800 litres" into 800 and "litres". */
function parseQuantity(quantity: string | null, kind: Kind) {
  const match = quantity?.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(.*)/);
  if (!match) return { amount: null, unit: DEFAULT_UNIT[kind] };
  return { amount: Number(match[1]), unit: match[2].trim() || DEFAULT_UNIT[kind] };
}

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Speech to text drops or adds zeros ("8000" heard as "8"), so offer the nearby powers of ten. */
function suggestions(amount: number | null) {
  if (amount == null || amount <= 0) return [];
  const all = [amount * 10, amount / 10, amount * 100, amount * 1000, amount / 100].filter((n) => Number.isInteger(n) && n > 0 && n <= 1_000_000);
  return [...new Set(all)].slice(0, 3).sort((a, b) => a - b);
}

function Row({ label, children, below }: { label: CrewKey; children: ReactNode; below?: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-3 py-3 first:pt-0 last:pb-0">
      <MlEn text={t(label)} className="text-caption text-ink-muted" mlClassName="text-small" enClassName="!text-caption" />
      <div className="min-w-0">{children}</div>
      {below && <div className="col-span-2">{below}</div>}
    </div>
  );
}

export function Receipt({
  entry,
  token,
  onCorrected,
}: {
  entry: Entry;
  token: string | null;
  onCorrected: (entry: Entry) => void;
}) {
  const pick = usePick();
  const [fixing, setFixing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { amount, unit } = parseQuantity(entry.quantity, entry.kind);
  const [typed, setTyped] = useState('');
  const level = LEVEL[entry.verification.level];
  const place = entry.verification.facilityName ?? entry.facilityMentioned;
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.at));

  async function save(quantity: string) {
    if (!token) return;
    setSaving(quantity);
    setError(null);
    try {
      const { entry: next } = await correctQuantity(entry.id, entry.boatId, quantity, token);
      onCorrected(next);
      setFixing(false);
      setTyped('');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? pick(t('offlineBody')) : (err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    const n = Number(typed.replace(/,/g, ''));
    if (!typed.trim() || !Number.isFinite(n) || n < 0) return;
    save(`${typed.replace(/,/g, '').trim()} ${unit}`);
  }

  return (
    <section
      aria-label={pick(t('savedTitle'))}
      className="surface-light relative rounded-card border border-gold-edge/70 bg-kasavu p-5 text-ink shadow-[var(--shadow-card)]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-[5px] rounded-[calc(var(--radius-card)-5px)] border-[1.5px] border-gold-edge/50" />
      <div className="relative">
        <header className="mb-4 flex items-start justify-between gap-3">
          <MlEn text={t('savedTitle')} className="font-semibold" mlClassName="text-body" enClassName="!text-small" />
          <time dateTime={entry.at} className="shrink-0 pt-0.5 text-caption tabular-nums text-ink-muted">
            {time}
          </time>
        </header>

        <div className="divide-y divide-line">
          <Row label="waste">
            <MlEn text={t(KIND[entry.kind])} className="font-semibold" mlClassName="text-body" enClassName="!text-small font-normal" />
          </Row>

          <Row
            label="quantity"
            below={
              <>
            <AnimatePresence initial={false}>
              {fixing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <MlEn text={t('fixTitle')} className="mb-2 text-small text-ink-muted" />
                    {suggestions(amount).length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {suggestions(amount).map((n) => {
                          const q = `${n} ${unit}`;
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={saving !== null}
                              onClick={() => save(q)}
                              aria-busy={saving === q || undefined}
                              className="inline-flex min-h-12 items-center rounded-control bg-gold px-4 text-body font-semibold text-teak shadow-[var(--shadow-button)] tabular-nums
                                transition-[scale,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] enabled:active:scale-[0.96] disabled:opacity-55 aria-busy:animate-pulse"
                            >
                              {number.format(n)} {unit}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <form onSubmit={submitTyped} className="flex items-end gap-2">
                      <label className="min-w-0 flex-1">
                        <MlEn text={t('fixOther')} className="mb-1 text-small text-ink-muted" mlClassName="text-small" />
                        <span className="flex items-center rounded-control border border-field-border bg-kasavu focus-within:outline-3 focus-within:outline-focus">
                          <input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            inputMode="decimal"
                            enterKeyHint="done"
                            autoComplete="off"
                            placeholder={amount != null ? String(amount) : '800'}
                            className="min-h-12 w-full min-w-0 bg-transparent px-3 tabular-nums outline-none"
                          />
                          <span className="pe-3 text-small text-ink-muted">{unit}</span>
                        </span>
                      </label>
                      <button
                        type="submit"
                        disabled={saving !== null || !typed.trim()}
                        className="min-h-12 rounded-control bg-teak px-4 font-semibold text-ink-inverse transition-[scale,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] enabled:active:scale-[0.96] disabled:opacity-45"
                      >
                        {pick(t('fixSave'))}
                      </button>
                    </form>
                    {error && (
                      <p role="alert" className="mt-2 text-small text-ink">
                        <MlEn text={t('fixFailed')} layout="inline" className="font-semibold" /> {error}
                      </p>
                    )}
                    <button type="button" onClick={() => setFixing(false)} className="mt-2 min-h-11 text-small font-semibold text-ink-muted underline underline-offset-4">
                      {pick(t('cancel'))}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-lead font-semibold tabular-nums">{entry.quantity ?? pick(t('notSaid'))}</span>
              {entry.corrected && (
                <span className="rounded-pill bg-surface px-2 py-0.5 text-caption font-semibold text-gold-ink">
                  <MlEn text={t('corrected')} layout="inline" />
                </span>
              )}
              {token && !fixing && (
                <button
                  type="button"
                  onClick={() => setFixing(true)}
                  className="-my-1 ms-auto inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-field-border/60 bg-surface px-3.5 text-small font-semibold
                    transition-[scale,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.96] hover:bg-kasavu"
                >
                  <Icon.Pencil size={16} />
                  <MlEn text={t('fix')} layout="inline" />
                </button>
              )}
            </div>

          </Row>

          <Row label="place">
            <p className="font-semibold">{place ?? pick(t('notSaid'))}</p>
            {entry.verification.distanceM != null && entry.verification.distanceM > 0 && (
              <p className="text-small tabular-nums text-ink-muted">{formatDistance(entry.verification.distanceM)}</p>
            )}
          </Row>

          <Row label="proof">
            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-small font-semibold ${level.className}`}>
              {entry.verification.level === 'declared' ? <Icon.Alert size={15} /> : <Icon.Check size={15} strokeWidth={2.6} />}
              <MlEn text={t(level.key)} layout="inline" />
            </span>
            <MlEn text={t(reasonKey(entry))} className="mt-2 text-small" mlClassName="text-small" enClassName="!text-caption text-ink-muted !opacity-100" />
          </Row>
        </div>

        {entry.photo && (
          <div className="mt-4 flex items-center gap-3 rounded-control bg-surface p-2.5">
            <img
              src={`/uploads/${entry.photo.file}`}
              alt=""
              className="size-14 rounded-[0.5rem] object-cover outline outline-1 -outline-offset-1 outline-black/10"
            />
            <div className="min-w-0 text-small">
              <MlEn text={t(entry.photo.isReceipt ? 'photoIsReceipt' : 'photoNotReceipt')} enClassName="!text-caption text-ink-muted !opacity-100" />
              {entry.photo.issuer && <p className="truncate text-caption text-ink-muted">{entry.photo.issuer}</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

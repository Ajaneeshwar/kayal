import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError, attachPhoto, correctQuantity, formatDistance, shrinkPhoto, type Entry, type Kind, type Level, type Reply } from './api.ts';
import { t } from './i18n.ts';
import { usePick } from '../../i18n/language.ts';
import type { CrewKey } from './strings.ts';
import { Icon, MlEn } from './ui.tsx';
import { MethodIcon, isMobileHandover, methodOf, type Method } from '../../components/MethodIcon.tsx';
import { DisputedIcon, StampIcon } from '../../components/StatusBadge.tsx';

const KIND: Record<Kind, CrewKey> = {
  sewage_pumpout: 'kindSewage',
  solid_waste: 'kindSolid',
  engine_oil: 'kindOil',
};

const LEVEL: Record<Level | 'disputed', { key: CrewKey; className: string }> = {
  declared: { key: 'levelDeclared', className: 'bg-declared-soft text-declared' },
  location: { key: 'levelLocation', className: 'bg-verified-soft text-verified' },
  receipt: { key: 'levelReceipt', className: 'bg-verified-soft text-verified' },
  confirmed: { key: 'levelConfirmed', className: 'bg-confirmed-soft text-confirmed' },
  disputed: { key: 'levelDisputed', className: 'bg-declared-soft text-declared' },
};

function LevelGlyph({ level }: { level: Level | 'disputed' }) {
  if (level === 'confirmed') return <StampIcon size={15} />;
  if (level === 'disputed') return <DisputedIcon size={15} />;
  if (level === 'declared') return <Icon.Alert size={15} />;
  return <Icon.Check size={15} strokeWidth={2.6} />;
}

function reasonKey(entry: Entry): CrewKey {
  const { level, reason } = entry.verification;
  if (entry.disputed || reason === 'operator_disputed') return 'reasonDisputed';
  if (level === 'confirmed') return 'reasonConfirmed';
  if (reason === 'handover_slip') return 'reasonHandoverSlip';
  if (reason === 'no_fixed_point') return 'reasonNoFixedPoint';
  if (reason === 'waste_bin') return 'reasonWasteBin';
  if (level === 'receipt') return 'reasonReceipt';
  if (level === 'location') return 'reasonLocation';
  if (reason === 'no_facility') return 'reasonNoFacility';
  if (reason === 'too_far') return 'reasonTooFar';
  if (reason === 'closed') return 'reasonClosed';
  return 'reasonNoLocation';
}

const METHOD: Record<Method, CrewKey> = {
  collection_point: 'methodPoint',
  suction_truck: 'methodTruck',
  mobile_pump: 'methodPump',
  waste_collector: 'methodCollector',
  waste_bin: 'methodBin',
};

const DEFAULT_UNIT: Record<Kind, string> = { sewage_pumpout: 'litres', solid_waste: 'bags', engine_oil: 'litres' };

/** Splits "800 litres" into 800 and "litres". */
function parseQuantity(quantity: string | null, kind: Kind) {
  const match = quantity?.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(.*)/);
  if (!match) return { amount: null, unit: DEFAULT_UNIT[kind] };
  return { amount: Number(match[1]), unit: match[2].trim() || DEFAULT_UNIT[kind] };
}

/** The server takes a correction or a photo for 30 minutes after the entry was saved. */
const EDIT_WINDOW_MS = 30 * 60 * 1000;

/** True until 30 minutes after the entry was saved, then false, with no reload. */
function useEditWindow(at: string) {
  const deadline = Date.parse(at) + EDIT_WINDOW_MS;
  const [open, setOpen] = useState(() => Date.now() < deadline);
  useEffect(() => {
    const left = deadline - Date.now();
    if (left <= 0) return setOpen(false);
    setOpen(true);
    const id = window.setTimeout(() => setOpen(false), left);
    return () => window.clearTimeout(id);
  }, [deadline]);
  return open;
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
  onPhotoAdded,
  onBeforePhoto,
}: {
  entry: Entry;
  token: string | null;
  onCorrected: (entry: Entry) => void;
  onPhotoAdded: (entry: Entry, reply: Reply | null | undefined) => void;
  /** Runs inside the tap on Add photo, so the spoken reply may play when the photo is read. */
  onBeforePhoto?: () => void;
}) {
  const pick = usePick();
  const [fixing, setFixing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { amount, unit } = parseQuantity(entry.quantity, entry.kind);
  const [typed, setTyped] = useState('');
  const shown = entry.disputed ? 'disputed' : entry.verification.level;
  const level = LEVEL[shown];
  const method = methodOf(entry);
  const mobile = isMobileHandover(method);
  const place = method === 'collection_point' ? (entry.verification.facilityName ?? entry.facilityMentioned) : null;
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.at));
  const windowOpen = useEditWindow(entry.at);
  const fileInput = useRef<HTMLInputElement>(null);
  // The photo on its way, shown at once from the phone, then kept so the thumbnail does not reload.
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [photoError, setPhotoError] = useState<{ title: CrewKey; detail: string | null } | null>(null);
  // Nobody receives waste at a bin, and a Confirmed entry already has the strongest proof.
  const canAddPhoto =
    Boolean(token) && windowOpen && method !== 'waste_bin' && entry.verification.level !== 'confirmed' && !entry.voided && !reading;
  const thumb = preview ?? (entry.photo ? `/uploads/${entry.photo.file}` : null);

  function openCamera() {
    onBeforePhoto?.();
    fileInput.current?.click();
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !token) return;
    setPhotoError(null);
    let photo: { base64: string; previewUrl: string };
    try {
      photo = await shrinkPhoto(file);
    } catch {
      setPhotoError({ title: 'photoFailTitle', detail: pick(t('photoFailBody')) });
      return;
    }
    setPreview(photo.previewUrl);
    setReading(true);
    try {
      const { entry: next, reply } = await attachPhoto(entry.id, entry.boatId, token, photo.base64);
      onPhotoAdded(next, reply);
    } catch (err) {
      // Nothing was saved, so the thumbnail goes back to the last saved photo, if any.
      setPreview(null);
      setPhotoError({ title: 'photoAddFailed', detail: err instanceof ApiError && err.status === 0 ? pick(t('offlineBody')) : (err as Error).message });
    } finally {
      setReading(false);
    }
  }

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

          <Row label="handover">
            <div className="flex items-start gap-2">
              <MethodIcon method={method} size={20} className="mt-px text-gold-ink" />
              <MlEn text={t(METHOD[method])} className="min-w-0 font-semibold" mlClassName="text-body" enClassName="!text-small font-normal" />
            </div>
            {method === 'collection_point' && (
              <p className="mt-1 [overflow-wrap:anywhere]">
                {place ?? <span className="text-ink-muted">{pick(t('notSaid'))}</span>}
                {entry.verification.distanceM != null && entry.verification.distanceM > 0 && (
                  <span className="ms-2 text-small tabular-nums text-ink-muted">{formatDistance(entry.verification.distanceM)}</span>
                )}
              </p>
            )}
            {(entry.vehicleNumber || entry.handedTo) && (
              <dl className="mt-1.5 grid gap-1 text-small">
                {entry.vehicleNumber && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="text-ink-muted">
                      <MlEn text={t('vehicle')} layout="inline" mlClassName="text-small" enClassName="text-caption" />
                    </dt>
                    <dd className="font-semibold tabular-nums tracking-[0.02em] [overflow-wrap:anywhere]">
                      <bdi>{entry.vehicleNumber}</bdi>
                    </dd>
                  </div>
                )}
                {entry.handedTo && (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="text-ink-muted">
                      <MlEn text={t('receivedBy')} layout="inline" mlClassName="text-small" enClassName="text-caption" />
                    </dt>
                    <dd className="font-semibold [overflow-wrap:anywhere]">
                      <bdi>{entry.handedTo}</bdi>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Row>

          <Row
            label="proof"
            below={
              (thumb || canAddPhoto || photoError) && (
                <div className="mt-3 flex flex-col items-start gap-3">
                  {thumb && (
                    <div className="flex w-full items-center gap-3 rounded-control bg-surface p-2.5">
                      <span className="relative size-14 shrink-0">
                        <img src={thumb} alt="" className="size-14 rounded-[0.5rem] object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                        {reading && (
                          <span className="absolute inset-0 grid place-items-center rounded-[0.5rem] bg-teak-deep/45">
                            <span className="size-5 animate-spin rounded-full border-2 border-kasavu border-r-transparent" />
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 text-small">
                        {reading || !entry.photo ? (
                          <MlEn text={t('photoReading')} className="font-semibold" mlClassName="text-small" enClassName="!text-caption font-normal" />
                        ) : (
                          <>
                            <MlEn
                              text={t(mobile ? (entry.photo.isReceipt ? 'photoIsSlip' : 'photoNotSlip') : entry.photo.isReceipt ? 'photoIsReceipt' : 'photoNotReceipt')}
                              enClassName="!text-caption text-ink-muted !opacity-100"
                            />
                            {entry.photo.issuer && <p className="truncate text-caption text-ink-muted">{entry.photo.issuer}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {canAddPhoto && (
                    <>
                      <button
                        type="button"
                        onClick={openCamera}
                        className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-field-border/60 bg-surface px-3.5 text-small font-semibold
                          transition-[scale,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.96] hover:bg-kasavu"
                      >
                        <Icon.Camera size={18} />
                        <MlEn text={t('addPhoto')} layout="inline" />
                      </button>
                      {mobile && entry.verification.level === 'declared' && (
                        <MlEn text={t('slipTip')} className="-mt-1 text-small" mlClassName="text-small" enClassName="!text-caption text-ink-muted !opacity-100" />
                      )}
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        tabIndex={-1}
                        onChange={(e) => {
                          addPhoto(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </>
                  )}
                  {photoError && (
                    <p role="alert" className="flex w-full items-start gap-2 text-small text-ink">
                      <Icon.Alert size={18} className="mt-0.5 shrink-0 text-gold-ink" />
                      <span className="min-w-0">
                        <MlEn text={t(photoError.title)} layout="inline" className="font-semibold" mlClassName="text-small" />{' '}
                        {photoError.detail}
                      </span>
                    </p>
                  )}
                </div>
              )
            }
          >
            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-small font-semibold ${level.className}`}>
              <LevelGlyph level={shown} />
              <MlEn text={t(level.key)} layout="inline" />
            </span>
            <MlEn text={t(reasonKey(entry))} className="mt-2 text-small" mlClassName="text-small" enClassName="!text-caption text-ink-muted !opacity-100" />
          </Row>
        </div>
      </div>
    </section>
  );
}

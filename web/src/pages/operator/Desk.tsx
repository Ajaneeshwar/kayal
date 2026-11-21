import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { MethodIcon, methodOf } from '../../components/MethodIcon.tsx';
import { usePick } from '../../i18n/language.ts';
import {
  ApiError,
  findByCode,
  getPending,
  hasUnloadRoute,
  isHandoverCode,
  normaliseCode,
  recordUnload,
  type Confirmation,
  type Directory,
  type Entry,
  type Operator,
  type Session,
} from './api.ts';
import { AlreadyDecided, ConfirmForm, EntrySummary, Result } from './HandoverView.tsx';
import { t } from './i18n.ts';
import { operatorDetail } from './SignIn.tsx';
import { Shell } from './Shell.tsx';
import type { OperatorKey } from './strings.ts';
import { ago, Banner, clockTime, Field, Icon, INPUT, KIND, LevelChip, METHOD, TYPE, TypeMark } from './ui.tsx';

const REFRESH_MS = 10_000;
const EASE = [0.23, 1, 0.32, 1] as const;

type View =
  | { kind: 'list' }
  | { kind: 'entry'; entry: Entry }
  | { kind: 'done'; entry: Entry; confirmation: Confirmation }
  | { kind: 'missing'; reason: Extract<OperatorKey, 'forbidden' | 'notFound'> };

/** A clock for relative times, ticking every 30 s. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function Desk({
  session,
  operator,
  directory,
  initialPending,
  entryId,
  onEntryHandled,
  onSignOut,
}: {
  session: Session;
  operator: Operator;
  directory: Directory | null;
  initialPending: Entry[] | null;
  /** From a crew's QR link: open this handover first. */
  entryId: string | null;
  onEntryHandled: () => void;
  onSignOut: (expired: boolean) => void;
}) {
  const [pending, setPending] = useState<Entry[] | null>(initialPending);
  const [updatedAt, setUpdatedAt] = useState<number | null>(initialPending ? Date.now() : null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [unloadable, setUnloadable] = useState(false);
  const now = useNow();
  const inFlight = useRef<AbortController | null>(null);
  const openedLink = useRef(false);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setRefreshing(true);
    try {
      const { pending: next } = await getPending(session, controller.signal);
      setPending(next);
      setUpdatedAt(Date.now());
      setRefreshFailed(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 401) return onSignOut(true);
      setRefreshFailed(true);
    } finally {
      if (inFlight.current === controller) setRefreshing(false);
    }
  }, [onSignOut, session]);

  // Load now if sign-in did not, then every 10 s while the page is on screen.
  useEffect(() => {
    if (!initialPending) refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(refresh, REFRESH_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        start();
      } else {
        clearInterval(timer);
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      inFlight.current?.abort();
    };
    // initialPending is read on the first run only.
  }, [refresh]);

  useEffect(() => {
    if (operator.type !== 'plant') return;
    const controller = new AbortController();
    hasUnloadRoute(session, controller.signal).then((yes) => !controller.signal.aborted && setUnloadable(yes));
    return () => controller.abort();
  }, [operator.type, session]);

  // A QR link names one entry. Open it once the list is in.
  useEffect(() => {
    if (!entryId || openedLink.current || !pending) return;
    openedLink.current = true;
    const waiting = pending.find((e) => e.id === entryId);
    const known = directory?.entries.find((e) => e.id === entryId);
    if (waiting) setView({ kind: 'entry', entry: waiting });
    else if (known?.confirmation) setView({ kind: 'entry', entry: known });
    else setView({ kind: 'missing', reason: known ? 'forbidden' : 'notFound' });
  }, [directory, entryId, pending]);

  function show(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
  }

  function backToList() {
    if (entryId) onEntryHandled();
    show({ kind: 'list' });
    refresh();
  }

  const boatOf = (entry: Entry) => directory?.boats.get(entry.boatId);

  return (
    <Shell headerBelow={<Identity operator={operator} directory={directory} />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.kind === 'list' ? 'list' : view.kind === 'missing' ? 'missing' : `${view.kind}-${view.entry.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          {view.kind === 'list' && (
            <div className="flex flex-col gap-6">
              <CodeSearch
                session={session}
                onFound={(entry) => show({ kind: 'entry', entry })}
                onExpired={() => onSignOut(true)}
              />
              <Waiting
                pending={pending}
                now={now}
                updatedAt={updatedAt}
                refreshing={refreshing}
                refreshFailed={refreshFailed}
                onRefresh={refresh}
                boatName={(e) => boatOf(e)?.name ?? e.boatId}
                onOpen={(entry) => show({ kind: 'entry', entry })}
              />
              {unloadable && <UnloadForm session={session} directory={directory} onExpired={() => onSignOut(true)} />}
              <SignOutButton onClick={() => onSignOut(false)} />
            </div>
          )}

          {view.kind === 'entry' && (
            <>
              <BackButton onClick={backToList} />
              <EntrySummary entry={view.entry} boat={boatOf(view.entry)} now={now} />
              {view.entry.confirmation ? (
                <AlreadyDecided entry={view.entry} />
              ) : (
                <ConfirmForm
                  entry={view.entry}
                  session={session}
                  onExpired={() => onSignOut(true)}
                  onDone={(entry, confirmation) => {
                    setPending((list) => list?.filter((e) => e.id !== entry.id) ?? list);
                    show({ kind: 'done', entry, confirmation });
                  }}
                />
              )}
            </>
          )}

          {view.kind === 'done' && <Result entry={view.entry} confirmation={view.confirmation} boat={boatOf(view.entry)} onBack={backToList} />}

          {view.kind === 'missing' && (
            <>
              <BackButton onClick={backToList} />
              <Card className="p-6">
                <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-declared-soft text-declared">
                  <Icon.Search size={24} />
                </span>
                <div role="alert" className="mt-4 text-body text-ink">
                  <Bi as="p" text={t(view.reason)} mlClassName="mt-1" />
                </div>
              </Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ms-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-control pe-3 ps-1.5 text-small font-semibold text-ink-inverse-muted transition-[scale,background-color,color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-teak-raised hover:text-ink-inverse active:scale-[0.96]"
    >
      <Icon.Back size={20} className="shrink-0" />
      <Bi text={t('back')} className="text-start leading-tight" mlClassName="font-normal" />
    </button>
  );
}

/** Who is signed in. The type icon stands for the type, so the line under the name names the vehicle or plant. */
function Identity({ operator, directory }: { operator: Operator; directory: Directory | null }) {
  const detail = operatorDetail(operator, directory);
  const type = t(TYPE[operator.type].one);
  return (
    <div className="mx-auto flex max-w-[36rem] items-center gap-3 px-4 pb-3 pt-1">
      <TypeMark type={operator.type} size="sm" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="font-semibold [overflow-wrap:anywhere]">{operator.name}</p>
        <p className="mt-0.5 text-caption text-ink-inverse-muted">
          {detail ? (
            <>
              <Bi text={type} className="sr-only" />
              <span className="whitespace-nowrap tabular-nums">{detail}</span>
            </>
          ) : (
            <Bi text={type} layout="inline" />
          )}
        </p>
      </div>
    </div>
  );
}

function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-control px-3 text-small font-semibold text-ink-inverse-muted shadow-[inset_0_0_0_1px_oklch(1_0_0/0.25)] transition-[scale,background-color,color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-white/10 hover:text-ink-inverse active:scale-[0.96]"
    >
      <Icon.SignOut size={18} className="shrink-0 text-gold" />
      <Bi text={t('signOut')} className="leading-tight" mlClassName="text-caption font-normal" />
    </button>
  );
}

type CodeProblem = Extract<OperatorKey, 'codeFormat' | 'codeNotFound' | 'forbidden' | 'loadFail'>;

function CodeSearch({ session, onFound, onExpired }: { session: Session; onFound: (entry: Entry) => void; onExpired: () => void }) {
  const id = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CodeProblem | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isHandoverCode(code)) return setProblem('codeFormat');
    setBusy(true);
    setProblem(null);
    try {
      onFound(await findByCode(session, code));
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 401) return onExpired();
      const status = err instanceof ApiError ? err.status : 0;
      setProblem(status === 400 ? 'codeFormat' : status === 404 ? 'codeNotFound' : status === 403 ? 'forbidden' : 'loadFail');
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate>
        <Bi as="h2" text={t('byCodeTitle')} className="font-display text-heading font-semibold text-ink" mlClassName="mt-0.5 text-body! text-ink-muted" />
        <div className="mt-3">
          <Field id={`${id}-code`} label={t('byCodeLabel')} help={t('byCodeHelp')} error={problem ? t(problem) : null}>
            <div className="flex flex-wrap gap-2">
              <input
                id={`${id}-code`}
                value={code}
                onChange={(e) => {
                  setCode(normaliseCode(e.target.value));
                  if (problem) setProblem(null);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                placeholder="7KQ4MZ"
                aria-invalid={problem ? true : undefined}
                aria-describedby={`${id}-code-help ${id}-code-error`}
                className={`${INPUT} w-auto flex-[1_1_9.5rem] text-center font-semibold uppercase tabular-nums tracking-[0.25em] placeholder:font-normal`}
              />
              <Button type="submit" variant="secondary" busy={busy} className="flex-[1_0_auto] px-4">
                <Icon.Search size={18} className="shrink-0" />
                <Bi text={t('find')} className="leading-tight" mlClassName="text-caption font-normal" />
              </Button>
            </div>
          </Field>
        </div>
      </form>
    </Card>
  );
}

function Waiting({
  pending,
  now,
  updatedAt,
  refreshing,
  refreshFailed,
  onRefresh,
  boatName,
  onOpen,
}: {
  pending: Entry[] | null;
  now: number;
  updatedAt: number | null;
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
  boatName: (entry: Entry) => string;
  onOpen: (entry: Entry) => void;
}) {
  const pick = usePick();
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex items-start gap-2 font-display text-heading font-semibold">
            <Bi text={t('waitingTitle')} className="min-w-0" mlClassName="mt-0.5 text-body! text-gold-bright" />
            {pending && pending.length > 0 && (
              <span className="mt-0.5 shrink-0 rounded-pill bg-gold px-2 py-0.5 font-sans text-caption font-semibold tabular-nums text-teak">{pending.length}</span>
            )}
          </h2>
          <Bi as="p" text={t('waitingHelp')} className="mt-1 text-small text-ink-inverse-muted" />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={pick(t('refresh'))}
          className="grid size-11 shrink-0 place-items-center rounded-full text-gold shadow-[inset_0_0_0_1px_oklch(1_0_0/0.25)] transition-[scale,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-white/10 active:scale-[0.96]"
        >
          <Icon.Refresh size={20} className={refreshing ? 'animate-spin [animation-duration:700ms]' : ''} />
        </button>
      </div>
      <p role="status" className="mt-1 min-h-5 text-caption tabular-nums text-ink-inverse-muted">
        {updatedAt && (
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
            <Bi text={t('updated')} layout="inline" />
            <span>{clockTime(updatedAt)}</span>
          </span>
        )}
      </p>

      {refreshFailed && (
        <div className="mt-3">
          <Banner text={t('refreshFailed')} tone="alert" />
        </div>
      )}

      {!pending && !refreshFailed && (
        <ul aria-hidden="true" className="mt-3 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <li key={i} className="h-36 rounded-card bg-teak-raised/60" />
          ))}
        </ul>
      )}

      {pending && pending.length === 0 && (
        <div className="mt-3 flex flex-col items-center rounded-card border border-dashed border-ink-inverse/25 px-5 py-8 text-center">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-teak-raised text-gold">
            <Icon.Inbox size={24} />
          </span>
          <Bi as="p" text={t('emptyTitle')} className="mt-3 font-semibold" mlClassName="mt-0.5 font-normal" />
          <Bi as="p" text={t('emptyBody')} className="mt-1 max-w-[34ch] text-small text-ink-inverse-muted" mlClassName="mt-1" />
        </div>
      )}

      {pending && pending.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {pending.map((entry) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <PendingCard entry={entry} boat={boatName(entry)} now={now} onOpen={() => onOpen(entry)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function PendingCard({ entry, boat, now, onOpen }: { entry: Entry; boat: string; now: number; onOpen: () => void }) {
  const method = methodOf(entry);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface-light group block w-full rounded-card border border-gold-edge/70 bg-kasavu p-4 text-start shadow-[var(--shadow-card)] transition-[scale] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.98]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-display text-heading font-semibold text-ink [overflow-wrap:anywhere]">{boat}</span>
        <time dateTime={entry.at} className="mt-1 shrink-0 text-caption tabular-nums text-ink-muted">
          <Bi text={ago(entry.at, now)} className="text-end" />
        </time>
      </span>
      <span className="mt-2 flex items-start justify-between gap-3 text-body text-ink">
        <Bi text={t(KIND[entry.kind])} className="min-w-0" mlClassName="text-small!" />
        {entry.quantity && <span className="shrink-0 font-semibold tabular-nums">{entry.quantity}</span>}
      </span>
      <span className="mt-1.5 flex items-start justify-between gap-3 text-small text-ink-muted">
        <span className="flex min-w-0 items-start gap-2">
          <MethodIcon method={method} size={18} className="mt-0.5 text-gold-ink" />
          <Bi text={t(METHOD[method])} className="min-w-0" />
        </span>
        {entry.vehicleNumber && <span className="shrink-0 font-semibold tabular-nums text-ink">{entry.vehicleNumber}</span>}
      </span>
      <span className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <LevelChip level={entry.verification.level} />
        <span className="inline-flex items-center gap-1 text-small font-semibold text-gold-ink">
          <Bi text={t('checkAndConfirm')} className="text-end leading-tight" mlClassName="mt-0.5 font-normal" />
          <Icon.Chevron size={18} className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

/** Plant desks only, and only when the server has the unload route (checked with a GET). */
function UnloadForm({ session, directory, onExpired }: { session: Session; directory: Directory | null; onExpired: () => void }) {
  const id = useId();
  const [vehicle, setVehicle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'done' | 'failed' | 'unknown'>('idle');
  const [last, setLast] = useState('');
  // Registered trucks and pump boats, offered as suggestions under the vehicle field.
  const vehicles = (directory?.operators ?? []).flatMap((o) => (o.vehicleNumber ? [o.vehicleNumber] : []));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!vehicle.trim() || !/\d/.test(quantity)) return setState('failed');
    setBusy(true);
    try {
      const { unload } = await recordUnload(session, { vehicleNumber: vehicle.trim(), quantity: quantity.trim() });
      setLast(`${unload?.vehicleNumber ?? vehicle.trim()} · ${unload?.quantity ?? quantity.trim()}`);
      setVehicle('');
      setQuantity('');
      setState('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onExpired();
      // The route exists (checked on load), so a 404 here is an unregistered vehicle.
      setState(err instanceof ApiError && err.status === 404 ? 'unknown' : 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <TypeMark type="suction_truck" />
          <div className="min-w-0">
            <Bi as="h2" text={t('unloadTitle')} className="font-display text-heading font-semibold text-ink" mlClassName="mt-0.5 text-body! text-ink-muted" />
            <Bi as="p" text={t('unloadHelp')} className="mt-1 text-small text-ink-muted" />
          </div>
        </div>
        <Field id={`${id}-vehicle`} label={t('unloadVehicle')}>
          <input
            id={`${id}-vehicle`}
            value={vehicle}
            onChange={(e) => {
              setVehicle(e.target.value.toUpperCase());
              setState('idle');
            }}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="KL-04-AB-1234"
            list={vehicles.length ? `${id}-vehicles` : undefined}
            className={`${INPUT} font-semibold tabular-nums placeholder:font-normal`}
          />
          {vehicles.length > 0 && (
            <datalist id={`${id}-vehicles`}>
              {vehicles.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          )}
        </Field>
        <Field id={`${id}-qty`} label={t('unloadQty')}>
          <input
            id={`${id}-qty`}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setState('idle');
            }}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="3000 litres"
            className={`${INPUT} font-semibold tabular-nums placeholder:font-normal`}
          />
        </Field>
        <div className="text-small">
          {state === 'done' && (
            <p role="status" className="flex items-start gap-2 rounded-control border border-line bg-surface px-4 py-3 text-ink">
              <Icon.Check size={18} className="mt-0.5 shrink-0 text-gold-ink" />
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <Bi text={t('unloadDone')} layout="inline" className="font-semibold" />
                <span className="tabular-nums [overflow-wrap:anywhere]">{last}</span>
              </span>
            </p>
          )}
          {(state === 'failed' || state === 'unknown') && (
            <div role="alert" className="rounded-control bg-overdue-soft px-4 py-3 text-overdue">
              <Bi text={t(state === 'unknown' ? 'unloadUnknownVehicle' : 'unloadFailed')} />
            </div>
          )}
        </div>
        <Button type="submit" variant="secondary" block busy={busy}>
          <Bi text={t('unloadSave')} className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-75" />
        </Button>
      </form>
    </Card>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type L from 'leaflet';
import { BrandMark } from '../../components/AppShell.tsx';
import { Bi } from '../../components/Bi.tsx';
import type { Text } from '../../i18n/index.ts';
import { readAdminPin } from '../../lib/api.ts';
import { ApiError, markReportReviewed, setFacilityOpen, signOut, type Boat, type Facility, type Report } from './api.ts';
import { AddBoatDialog, AddPointDialog } from './AddDialogs.tsx';
import { KIND_LABELS, LEVEL_LABELS, isToday } from './format.ts';
import { d } from './i18n.ts';
import { MapPanel } from './MapPanel.tsx';
import { BoatTable, Feed, Points, Reports, sortByUrgency } from './Panels.tsx';
import { QrDialog } from './QrDialog.tsx';
import { useDashboard, type Link } from './useDashboard.ts';
import './dashboard.css';

type Modal = { kind: 'qr'; boat: Boat } | { kind: 'boat' } | { kind: 'point' } | null;
type Tone = 'verified' | 'declared' | 'overdue' | 'plain';

const TONE_TEXT: Record<Tone, string> = {
  verified: 'text-verified',
  declared: 'text-declared',
  overdue: 'text-overdue',
  plain: 'text-ink',
};
const TONE_BAR: Record<Tone, string> = {
  verified: 'bg-verified',
  declared: 'bg-declared',
  overdue: 'bg-overdue',
  plain: 'bg-gold-edge',
};

function Stat({ label, value, tone, note }: { label: Text; value: number | string; tone: Tone; note?: string }) {
  return (
    <div className="surface-light relative overflow-hidden rounded-card border border-gold-edge/60 bg-kasavu px-5 pb-4 pt-4 shadow-[var(--shadow-card)]">
      <span aria-hidden="true" className={`absolute inset-y-4 start-0 w-1 rounded-e-full ${TONE_BAR[tone]}`} />
      <Bi text={label} className="text-small font-semibold text-ink-muted" />
      <p className={`mt-1 font-display text-[clamp(2.25rem,1.4rem+1.6vw,3.25rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums ${TONE_TEXT[tone]}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            className="inline-block"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </p>
      {note && <p className="mt-1.5 truncate text-caption text-ink-muted">{note}</p>}
    </div>
  );
}

function LinkPill({ link }: { link: Link }) {
  const live = link === 'live';
  return (
    <span className="inline-flex items-center gap-2 rounded-pill bg-surface px-2.5 py-1 text-caption font-semibold text-ink-muted ring-1 ring-line" title={live ? 'Entries arrive as they are logged' : 'Checking for new entries every 5 seconds'}>
      <span className="relative grid size-2 place-items-center" aria-hidden="true">
        {live && <span className="kl-ping absolute inset-0 rounded-full bg-gold-ink" />}
        <span className={`size-2 rounded-full ${live ? 'bg-gold-ink' : 'bg-ink-muted/60'}`} />
      </span>
      {live ? 'Live' : link === 'connecting' ? 'Connecting' : 'Every 5 s'}
    </span>
  );
}

function ChainPill({ ok, count, brokenAt }: { ok: boolean; count: number; brokenAt: number | null }) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 rounded-pill px-3 text-small font-semibold ${ok ? 'bg-teak-raised text-ink-inverse' : 'bg-overdue-soft text-overdue'}`}
      title={ok ? 'Every record still matches the hash of the one before it' : 'A record was changed after it was written'}
    >
      <svg viewBox="0 0 16 16" className={`size-4 ${ok ? 'text-gold' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        {ok ? (
          <path d="M6.5 9.5l3-3M5 7.5 3.6 8.9a2.4 2.4 0 0 0 3.5 3.5L8.5 11M11 8.5l1.4-1.4a2.4 2.4 0 0 0-3.5-3.5L7.5 5" />
        ) : (
          <path d="M5 7.5 3.6 8.9a2.4 2.4 0 0 0 3.5 3.5L8.5 11M11 8.5l1.4-1.4a2.4 2.4 0 0 0-3.5-3.5L7.5 5M2.5 2.5l2 2M13.5 13.5l-2-2" />
        )}
      </svg>
      <Bi text={d(ok ? 'chainOk' : 'chainBroken')} layout="inline" />
      <span className={`tabular-nums ${ok ? 'text-ink-inverse-muted' : ''}`}>
        {ok ? `${count} records` : `at record ${(brokenAt ?? 0) + 1} of ${count}`}
      </span>
    </span>
  );
}

function HeaderButton({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-control px-3.5 text-small font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] ${
        primary ? 'bg-gold text-teak shadow-[var(--shadow-button)] hover:bg-gold-bright' : 'border border-ink-inverse/25 text-ink-inverse hover:border-ink-inverse/60'
      }`}
    >
      {children}
    </button>
  );
}

const Plus = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

interface Toast {
  id: string;
  title: string;
  body: string;
  tone: 'verified' | 'declared' | 'error';
}

export default function DashboardPage() {
  const signedIn = useRef(readAdminPin() !== null).current;
  useEffect(() => {
    if (!signedIn) window.location.replace('/');
  }, [signedIn]);

  const { state, setState, reports, setReports, error, link, fresh, refresh } = useDashboard();
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const centre = useRef<L.LatLngTuple>([9.53, 76.38]);
  const onCentre = useCallback((c: L.LatLngTuple) => {
    centre.current = c;
  }, []);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), 5500);
  }, []);

  const boats = useMemo(() => new Map((state?.boats ?? []).map((b) => [b.id, b])), [state]);
  const sorted = useMemo(() => sortByUrgency(state?.boats ?? []), [state]);
  const freshBoats = useMemo(() => new Set((state?.entries ?? []).filter((e) => fresh.has(e.id)).map((e) => e.boatId)), [state, fresh]);

  // Announce the newest arrival over the map.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    const newest = state?.entries.find((e) => fresh.has(e.id));
    if (!newest || announced.current === newest.id) return;
    announced.current = newest.id;
    const tone = newest.verification.level === 'declared' ? 'declared' : 'verified';
    showToast({
      id: newest.id,
      title: `${boats.get(newest.boatId)?.name ?? 'A boat'} logged an entry`,
      body: `${KIND_LABELS[newest.kind]} · ${LEVEL_LABELS[newest.verification.level]}`,
      tone,
    });
  }, [state, fresh, boats, showToast]);

  const fail = useCallback(
    (err: unknown) => {
      const message =
        err instanceof ApiError && err.status === 401 ? 'The server did not accept your PIN. Sign out and sign in again.' : (err as Error).message;
      showToast({ id: String(Date.now()), title: 'That did not work', body: message, tone: 'error' });
    },
    [showToast],
  );

  const withBusy = async (id: string, job: () => Promise<void>) => {
    setBusy((s) => new Set([...s, id]));
    try {
      await job();
    } catch (err) {
      fail(err);
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const toggleFacility = (f: Facility) =>
    withBusy(f.id, async () => {
      const { facility } = await setFacilityOpen(f.id, !f.open);
      setState((s) => s && { ...s, facilities: s.facilities.map((x) => (x.id === facility.id ? facility : x)) });
      refresh();
    });

  const review = (r: Report) =>
    withBusy(r.id, async () => {
      await markReportReviewed(r.id);
      setReports((list) => list?.map((x) => (x.id === r.id ? { ...x, reviewed: true } : x)) ?? list);
      refresh();
    });

  if (!signedIn) return null;

  const count = (s: Boat['status']['state']) => state?.boats.filter((b) => b.status.state === s).length ?? 0;
  const today = state?.entries.filter((e) => isToday(e.at)).length ?? 0;
  const openReports = reports ? reports.filter((r) => !r.reviewed).length : reports === null ? '–' : 0;
  const total = state?.boats.length ?? 0;
  const dash = state ? null : '–';

  return (
    <div className="kl-dash flex min-h-dvh flex-col bg-surface">
      <a href="#map" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-control bg-gold px-4 py-2 font-semibold text-teak transition-transform focus-visible:translate-y-0">
        Skip to the map
      </a>

      <header className="kl-teak bg-teak text-ink-inverse">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-5 gap-y-3 px-5 pb-5 pt-4 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2 rounded-md">
            <BrandMark className="size-7 text-gold" />
            <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">Kayal Log</span>
          </a>
          <span aria-hidden="true" className="h-6 w-px bg-ink-inverse/20" />
          <Bi as="h1" text={d('title')} layout="inline" className="font-display text-lead font-semibold" mlClassName="text-ink-inverse-muted" />
          <div className="ms-auto flex flex-wrap items-center gap-2.5">
            {state && <ChainPill {...state.chain} />}
            <HeaderButton onClick={() => setModal({ kind: 'boat' })}>
              <Plus />
              {d('addBoat').en}
            </HeaderButton>
            <HeaderButton primary onClick={() => setModal({ kind: 'point' })}>
              <Plus />
              {d('addPoint').en}
            </HeaderButton>
            <button type="button" onClick={signOut} className="min-h-10 rounded-control px-2 text-small font-semibold text-ink-inverse-muted underline decoration-ink-inverse/30 underline-offset-4 hover:text-ink-inverse">
              {d('signOut').en}
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-[110rem] grid-cols-2 gap-3 px-5 pb-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4 lg:px-8">
          <Stat label={d('statVerified')} value={dash ?? count('verified')} tone="verified" note={`of ${total} boats`} />
          <Stat label={d('statDeclared')} value={dash ?? count('declared')} tone="declared" note="No location or receipt" />
          <Stat label={d('statOverdue')} value={dash ?? count('overdue')} tone="overdue" note={`${state?.overdueDays ?? 90}-day limit passed`} />
          <Stat label={d('statToday')} value={dash ?? today} tone="plain" note={`${state?.entries.length ?? 0} in the recent log`} />
          <Stat label={d('statReports')} value={dash ?? openReports} tone="plain" note={reports === null ? 'Not available yet' : 'From guests on board'} />
        </div>
      </header>

      {error && (
        <div role="alert" className="mx-auto mt-4 w-full max-w-[110rem] px-5 lg:px-8">
          <p className="surface-light rounded-control bg-overdue-soft px-4 py-3 text-small font-medium text-overdue">
            {error} Showing the last data we had. Trying again every few seconds.
          </p>
        </div>
      )}

      <main id="main" className="surface-light mx-auto grid w-full max-w-[110rem] flex-1 gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section id="map" aria-label="Map" className="relative h-[28rem] min-w-0 overflow-hidden rounded-card border border-line bg-teak shadow-[var(--shadow-card)] lg:h-[min(64vh,38rem)]">
          {state && <MapPanel facilities={state.facilities} entries={state.entries} boats={boats} fresh={fresh} onCentre={onCentre} />}
            <div className="kl-glass absolute start-3 top-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-control px-4 py-2.5">
              <Bi as="h2" text={d('mapTitle')} className="font-display text-body font-semibold" />
            </div>
            <ul className="kl-glass absolute bottom-3 start-3 z-[500] hidden flex-col gap-1.5 rounded-control px-3.5 py-2.5 text-caption font-medium sm:flex" aria-label="Map key">
              <li className="flex items-center gap-2">
                <span className="kl-fac is-open is-key" aria-hidden="true" /> Point open
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-fac is-closed is-key" aria-hidden="true" /> Point closed
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-entry is-verified is-key" aria-hidden="true" /> Entry, location matched
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-entry is-declared is-key" aria-hidden="true" /> Entry, declared only
              </li>
            </ul>
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
                className="absolute end-3 top-3 z-[600] w-[min(24rem,calc(100%-1.5rem))]"
              >
                <div className="surface-light flex items-start gap-3 rounded-card border border-gold-edge/70 bg-kasavu px-4 py-3 shadow-[var(--shadow-raised)]">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${toast.tone === 'verified' ? 'bg-verified' : toast.tone === 'declared' ? 'bg-declared' : 'bg-overdue'}`}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{toast.title}</p>
                    <p className="text-small text-ink-muted">{toast.body}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="min-h-0 lg:h-[min(64vh,38rem)] [&>section]:h-full">
          {state ? (
            <Feed entries={state.entries} boats={boats} fresh={fresh} link={<LinkPill link={link} />} />
          ) : (
            <div className="h-full min-h-60 animate-pulse rounded-card bg-line/50" />
          )}
        </div>

        <div className="min-w-0">
          {state ? (
            <BoatTable boats={sorted} window={state.overdueDays} onQr={(boat) => setModal({ kind: 'qr', boat })} freshBoats={freshBoats} />
          ) : (
            <div className="h-80 animate-pulse rounded-card bg-line/50" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {state && <Points facilities={state.facilities} busy={busy} onToggle={toggleFacility} onAdd={() => setModal({ kind: 'point' })} />}
          <Reports reports={reports} boats={boats} busy={busy} onReview={review} />
        </div>
      </main>

      <footer className="bg-teak-deep py-5 text-caption text-ink-inverse-muted">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-1 px-5 sm:flex-row sm:justify-between lg:px-8">
          <p>Location shows the phone was at the point. It does not prove the tank was emptied.</p>
          <p>Malayalam is machine-translated and not yet checked by a native speaker.</p>
        </div>
      </footer>

      {modal?.kind === 'qr' && <QrDialog boat={modal.boat} onClose={() => setModal(null)} />}
      {modal?.kind === 'boat' && (
        <AddBoatDialog
          onClose={() => setModal(null)}
          onAdded={(boat) => {
            setModal({ kind: 'qr', boat });
            refresh();
          }}
        />
      )}
      {modal?.kind === 'point' && (
        <AddPointDialog
          centre={centre.current}
          onClose={() => setModal(null)}
          onAdded={(f) => {
            setModal(null);
            showToast({ id: f.id, title: `${f.name} added`, body: 'It is open and on the map.', tone: 'verified' });
            refresh();
          }}
        />
      )}
    </div>
  );
}

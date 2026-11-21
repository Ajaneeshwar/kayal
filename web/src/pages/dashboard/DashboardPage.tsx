import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BrandMark } from '../../components/AppShell.tsx';
import { Bi } from '../../components/Bi.tsx';
import { AccessNotice } from '../../components/AccessNotice.tsx';
import { LanguageSwitch } from '../../components/LanguageSwitch.tsx';
import { usePick } from '../../i18n/language.ts';
import type { Text } from '../../i18n/index.ts';
import { readAdminPin } from '../../lib/api.ts';
import { ApiError, markReportReviewed, setFacilityOpen, signOut, type Boat, type Entry, type Facility, type ReminderCall, type Report } from './api.ts';
import { CallOwnerDialog } from './CallOwnerDialog.tsx';
import { AddBoatDialog, AddPointDialog, AddReceiverDialog } from './AddDialogs.tsx';
import { KIND_LABELS, LEVEL_LABELS, shownLevel } from './format.ts';
import { d } from './i18n.ts';
import { MapPanel, type MapView } from './MapPanel.tsx';
import { BoatTable, Feed, Points, Receivers, Reports, TruckCustody, sortByUrgency } from './Panels.tsx';
import { QrDialog } from './QrDialog.tsx';
import { WithdrawDialog } from './WithdrawDialog.tsx';
import { useDashboard, type Link } from './useDashboard.ts';
import './dashboard.css';

type Modal = { kind: 'qr'; boat: Boat } | { kind: 'call'; boat: Boat } | { kind: 'boat' } | { kind: 'point' } | { kind: 'receiver' } | { kind: 'withdraw'; entry: Entry } | null;
type Tone = 'confirmed' | 'verified' | 'declared' | 'overdue' | 'plain';

const TONE_TEXT: Record<Tone, string> = {
  confirmed: 'text-confirmed',
  verified: 'text-verified',
  declared: 'text-declared',
  overdue: 'text-overdue',
  plain: 'text-ink',
};
const TONE_BAR: Record<Tone, string> = {
  confirmed: 'bg-confirmed',
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
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pill bg-surface px-2.5 py-1 text-caption font-semibold text-ink-muted ring-1 ring-line" title={live ? 'Entries arrive as they are logged' : 'Checking for new entries every 5 seconds'}>
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
  tone: 'confirmed' | 'verified' | 'declared' | 'error' | 'plain';
}

export default function DashboardPage() {
  return readAdminPin() ? <InspectorDashboard /> : <AccessNotice role="inspector" />;
}

function InspectorDashboard() {
  const { state, setState, reports, setReports, error, link, fresh, refresh } = useDashboard();
  const [modal, setModal] = useState<Modal>(null);
  const pick = usePick();
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  // The main map's latest view; the add-point dialog's small map starts from it.
  const mapView = useRef<MapView>({ centre: [9.53, 76.38], zoom: 13 });
  const onView = useCallback((v: MapView) => {
    mapView.current = v;
  }, []);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), 5500);
  }, []);

  const boats = useMemo(() => new Map((state?.boats ?? []).map((b) => [b.id, b])), [state]);
  const sorted = useMemo(() => sortByUrgency(state?.boats ?? []), [state]);
  // The newest reminder call per boat. The server lists them newest first.
  const calls = useMemo(() => {
    const map = new Map<string, ReminderCall>();
    for (const c of state?.reminderCalls ?? []) if (!map.has(c.boatId)) map.set(c.boatId, c);
    return map;
  }, [state]);
  // A withdrawn entry stays in the live log, struck through, but leaves the map.
  const mapEntries = useMemo(() => (state?.entries ?? []).filter((e) => !e.voided), [state]);
  const freshBoats = useMemo(() => new Set((state?.entries ?? []).filter((e) => fresh.has(e.id)).map((e) => e.boatId)), [state, fresh]);

  // Announce the newest arrival above the map.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    const newest = state?.entries.find((e) => fresh.has(e.id));
    if (!newest || announced.current === newest.id) return;
    announced.current = newest.id;
    const level = newest.verification.level;
    const tone = level === 'declared' ? 'declared' : level === 'confirmed' ? 'confirmed' : 'verified';
    showToast({
      id: newest.id,
      title: `${boats.get(newest.boatId)?.name ?? 'A boat'} logged an entry`,
      body: `${KIND_LABELS[newest.kind]} · ${LEVEL_LABELS[shownLevel(newest)]}`,
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

  const count = (s: Boat['status']['state']) => state?.boats.filter((b) => b.status.state === s).length ?? 0;
  const thisWeek = state?.weeklyEntryCount ?? 0;
  const openReports = reports ? reports.filter((r) => !r.reviewed).length : reports === null ? '–' : 0;
  const total = state?.boats.length ?? 0;
  const dash = state ? null : '–';
  // Receiver answers in the recent log. Withdrawn entries no longer count.
  const answered = (state?.entries ?? []).filter((e) => !e.voided && e.confirmation);
  const confirmedCount = answered.filter((e) => e.verification.level === 'confirmed').length;
  const disputedCount = answered.filter((e) => e.disputed).length;

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
              {pick(d('addBoat'))}
            </HeaderButton>
            <HeaderButton onClick={() => setModal({ kind: 'receiver' })}>
              <Plus />
              {pick(d('addReceiver'))}
            </HeaderButton>
            <HeaderButton primary onClick={() => setModal({ kind: 'point' })}>
              <Plus />
              {pick(d('addPoint'))}
            </HeaderButton>
            <button type="button" onClick={signOut} className="min-h-10 rounded-control px-2 text-small font-semibold text-ink-inverse-muted underline decoration-ink-inverse/30 underline-offset-4 hover:text-ink-inverse">
              {pick(d('signOut'))}
            </button>
            <LanguageSwitch />
          </div>
        </div>

        <div className="mx-auto grid max-w-[110rem] grid-cols-2 gap-3 px-5 pb-6 sm:grid-cols-3 lg:gap-4 lg:px-8 xl:grid-cols-6">
          <Stat label={d('statVerified')} value={dash ?? count('verified')} tone="verified" note={`of ${total} boats`} />
          <Stat label={d('statDeclared')} value={dash ?? count('declared')} tone="declared" note="No location or receipt" />
          <Stat label={d('statOverdue')} value={dash ?? count('overdue')} tone="overdue" note={`${state?.overdueDays ?? 90}-day limit passed`} />
          <Stat
            label={d('statConfirmed')}
            value={dash ?? confirmedCount}
            tone="confirmed"
            note={disputedCount ? `${disputedCount} disputed by the receiver` : 'None disputed'}
          />
          <Stat label={d('statWeek')} value={dash ?? thisWeek} tone="plain" note={`${state?.entries.length ?? 0} in the recent log`} />
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

      <main id="main" className="surface-light mx-auto grid w-full max-w-[110rem] flex-1 grid-cols-[minmax(0,1fr)] gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
              className="min-w-0 lg:col-span-2"
            >
              <div className="surface-light flex items-start gap-3 rounded-card border border-gold-edge/70 bg-kasavu px-4 py-3 shadow-[var(--shadow-raised)]">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    toast.tone === 'confirmed' ? 'bg-confirmed' : toast.tone === 'verified' ? 'bg-verified' : toast.tone === 'declared' ? 'bg-declared' : toast.tone === 'plain' ? 'bg-gold-edge' : 'bg-overdue'
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-semibold">{toast.title}</p>
                  <p className="text-small text-ink-muted">{toast.body}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <section id="map" aria-label="Map" className="relative h-[28rem] min-w-0 overflow-hidden rounded-card border border-line bg-teak shadow-[var(--shadow-card)] lg:h-[min(64vh,38rem)]">
          {state && <MapPanel facilities={state.facilities} entries={mapEntries} boats={boats} fresh={fresh} onView={onView} />}
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
                <span className="kl-entry is-confirmed is-key" aria-hidden="true" /> Entry, confirmed by receiver
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-entry is-verified is-key" aria-hidden="true" /> Entry, location matched
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-entry is-declared is-key" aria-hidden="true" /> Entry, declared only
              </li>
              <li className="flex items-center gap-2">
                <span className="kl-entry is-disputed is-key" aria-hidden="true">
                  <svg viewBox="0 0 10 10">
                    <path d="M3 3l4 4M7 3l-4 4" />
                  </svg>
                </span>
                Entry, disputed by receiver
              </li>
            </ul>
        </section>

        <div className="order-2 min-h-0 min-w-0 lg:order-none lg:h-[min(64vh,38rem)] [&>section]:h-full">
          {state ? (
            <Feed entries={state.entries} boats={boats} fresh={fresh} link={<LinkPill link={link} />} onWithdraw={(entry) => setModal({ kind: 'withdraw', entry })} />
          ) : (
            <div className="h-full min-h-60 animate-pulse rounded-card bg-line/50" />
          )}
        </div>

        <div className="min-w-0">
          {state ? (
            <BoatTable
              boats={sorted}
              window={state.overdueDays}
              onQr={(boat) => setModal({ kind: 'qr', boat })}
              onCall={(boat) => setModal({ kind: 'call', boat })}
              calls={calls}
              freshBoats={freshBoats}
            />
          ) : (
            <div className="h-80 animate-pulse rounded-card bg-line/50" />
          )}
        </div>

        <div className="order-3 flex min-w-0 flex-col gap-5 lg:order-none">
          {state && <Points facilities={state.facilities} busy={busy} onToggle={toggleFacility} onAdd={() => setModal({ kind: 'point' })} />}
          {state?.operators && <Receivers operators={state.operators} facilities={state.facilities} onAdd={() => setModal({ kind: 'receiver' })} />}
          {state?.custody && <TruckCustody rows={state.custody} />}
          <Reports reports={reports} boats={boats} busy={busy} onReview={review} />
        </div>
      </main>

      <footer className="bg-teak-deep py-5 text-caption text-ink-inverse-muted">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-1 px-5 sm:flex-row sm:justify-between lg:px-8">
          <p>Location shows the phone was at the point. It does not prove the tank was emptied.</p>
        </div>
      </footer>

      {modal?.kind === 'qr' && <QrDialog boat={modal.boat} publicUrl={state?.publicUrl} onClose={() => setModal(null)} />}
      {modal?.kind === 'call' && state && (
        <CallOwnerDialog
          boat={modal.boat}
          facilities={state.facilities}
          onClose={() => setModal(null)}
          onCalled={(call) => {
            // Shown in the boat's row at once; the next state load brings the server's own record.
            setState((s) => s && { ...s, reminderCalls: [call, ...(s.reminderCalls ?? [])] });
            refresh();
          }}
        />
      )}
      {modal?.kind === 'withdraw' && (
        <WithdrawDialog
          entry={modal.entry}
          boatName={boats.get(modal.entry.boatId)?.name ?? 'this boat'}
          onClose={() => setModal(null)}
          onDone={(next, reason) => {
            const id = modal.entry.id;
            setModal(null);
            setState((s) => s && {
              ...s,
              entries: s.entries.map((e) => (e.id === id ? { ...e, ...next, voided: true, voidReason: next.voidReason ?? reason } : e)),
            });
            const name = boats.get(modal.entry.boatId)?.name ?? 'the boat';
            showToast({ id: `void-${id}`, title: pick(d('withdrawnToast')), body: pick(d('withdrawnToastBody')).replace('{boat}', name), tone: 'plain' });
            refresh();
          }}
        />
      )}
      {modal?.kind === 'boat' && (
        <AddBoatDialog
          onClose={() => setModal(null)}
          onAdded={(boat) => {
            setModal({ kind: 'qr', boat });
            refresh();
          }}
        />
      )}
      {modal?.kind === 'receiver' && state && (
        <AddReceiverDialog
          facilities={state.facilities}
          onClose={() => setModal(null)}
          onAdded={(op) => {
            // The dialog stays open on the code; the list shows the new receiver at once.
            setState((s) => s && { ...s, operators: [...(s.operators ?? []), op] });
            refresh();
          }}
        />
      )}
      {modal?.kind === 'point' && (
        <AddPointDialog
          view={mapView.current}
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

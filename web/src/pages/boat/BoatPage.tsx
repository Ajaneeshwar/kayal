import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { motion } from 'motion/react';
import { AppShell } from '../../components/AppShell.tsx';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { MethodIcon, methodOf } from '../../components/MethodIcon.tsx';
import { pick, useLang } from '../../i18n/language.ts';
import { Seal } from './Seal.tsx';
import { LevelChip, Timeline } from './Timeline.tsx';
import { ReportSheet } from './ReportSheet.tsx';
import {
  bt,
  daysAgo,
  fetchBoat,
  fetchState,
  formatDate,
  LEVEL,
  METHOD,
  NotFoundError,
  type BoatRecord,
  type BoatState,
  type Chain,
  type Entry,
  type Level,
} from './data.ts';
import type { BoatStringKey } from './strings.ts';

type Load =
  | { status: 'loading' }
  | { status: 'ready'; boat: BoatRecord; entries: Entry[]; chain: Chain | null }
  | { status: 'missing'; boats: BoatRecord[] }
  | { status: 'error'; message: string };

const POLL_MS = 30_000;

function useBoatRecord(id: string) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let controller = new AbortController();
    const run = async (first: boolean) => {
      controller = new AbortController();
      const state = fetchState(controller.signal).catch(() => null);
      try {
        const { boat, entries } = await fetchBoat(id, controller.signal);
        const s = await state;
        if (live) setLoad({ status: 'ready', boat, entries, chain: s?.chain ?? null });
      } catch (err) {
        if (!live || (err as Error).name === 'AbortError') return;
        if (err instanceof NotFoundError) {
          const s = await state;
          if (live) setLoad({ status: 'missing', boats: s?.boats ?? [] });
        } else if (first) {
          setLoad({ status: 'error', message: (err as Error).message });
        }
        // A failed refresh keeps the record already on screen.
      }
    };
    setLoad({ status: 'loading' });
    run(true);
    // Live updates: refetch when this boat gets an entry or a correction. The poll is a fallback.
    let events: EventSource | null = null;
    if ('EventSource' in window) {
      events = new EventSource('/api/events');
      const onChange = (e: MessageEvent) => {
        try {
          if ((JSON.parse(e.data) as { boatId?: string }).boatId === id) run(false);
        } catch {
          // Ignore a malformed event; the poll catches up.
        }
      };
      events.addEventListener('entry', onChange);
      events.addEventListener('correction', onChange);
    }
    const timer = window.setInterval(() => run(false), POLL_MS);
    return () => {
      live = false;
      controller.abort();
      events?.close();
      window.clearInterval(timer);
    };
  }, [id, attempt]);

  return { load, retry: useCallback(() => setAttempt((n) => n + 1), []) };
}

const SEAL: Record<BoatState, { word: BoatStringKey; sentence: BoatStringKey; tone: string; soft: string }> = {
  verified: { word: 'sealVerified', sentence: 'sentenceVerified', tone: 'text-verified', soft: 'bg-verified' },
  declared: { word: 'sealDeclared', sentence: 'sentenceDeclared', tone: 'text-declared', soft: 'bg-declared' },
  overdue: { word: 'sealOverdue', sentence: 'sentenceOverdue', tone: 'text-overdue', soft: 'bg-overdue' },
};

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const, delay },
});

function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 text-gold-edge">
      <span className="h-px flex-1 bg-current opacity-60" />
      <svg viewBox="0 0 12 12" width="10" height="10">
        <path d="M6 0l6 6-6 6-6-6z" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-current opacity-60" />
    </div>
  );
}

function Fact({ label, children, className = '' }: { label: BoatStringKey; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-gold-ink">
        <Bi text={bt(label)} mlClassName="normal-case tracking-normal font-semibold text-[1em]! opacity-90!" />
      </dt>
      <dd className="mt-1 text-body text-ink">{children}</dd>
    </div>
  );
}

function ChainLine({ chain, count }: { chain: Chain | null; count: number }) {
  if (!chain) {
    return <p className="text-small text-ink-muted">The tamper check could not be loaded just now. It will try again shortly.</p>;
  }
  const word = bt(chain.ok ? 'chainOk' : 'chainBroken');
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${chain.ok ? 'bg-verified-soft text-verified' : 'bg-overdue-soft text-overdue'}`}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {chain.ok ? (
            <>
              <path d="M6.5 9.5l3-3" />
              <path d="M7.4 4.6l1.1-1.1a2.5 2.5 0 0 1 3.5 3.5l-1.1 1.1M8.6 11.4l-1.1 1.1A2.5 2.5 0 0 1 4 9l1.1-1.1" />
            </>
          ) : (
            <>
              <path d="M7.4 4.6l1.1-1.1a2.5 2.5 0 0 1 3.5 3.5l-1.1 1.1M8.6 11.4l-1.1 1.1A2.5 2.5 0 0 1 4 9l1.1-1.1" />
              <path d="M2.5 2.5l2 2M13.5 13.5l-2-2" />
            </>
          )}
        </svg>
      </span>
      <div className="text-small">
        <Bi text={word} className={`font-semibold ${chain.ok ? 'text-verified' : 'text-overdue'}`} />
        {chain.ok ? (
          <Bi as="p" text={{ en: bt('boatChainIntact').en.replace('{count}', String(count)), ml: bt('boatChainIntact').ml.replace('{count}', String(count)) }} className="text-ink-muted" />
        ) : (
          <p className="text-ink-muted">{`An entry was changed after it was written${chain.brokenAt != null ? ` (entry ${chain.brokenAt + 1} of ${chain.count})` : ''}. Treat this record with care and tell an inspector.`}</p>
        )}
      </div>
    </div>
  );
}

function Certificate({ boat, entries, chain }: { boat: BoatRecord; entries: Entry[]; chain: Chain | null }) {
  const lang = useLang();
  const { state, overdueDays, lastSewage } = boat.status;
  const seal = SEAL[state];
  const word = bt(seal.word);
  const lastEntry = lastSewage ? entries.find((e) => e.kind === 'sewage_pumpout' && e.at === lastSewage.at) : undefined;
  const lastMethod = lastEntry ? methodOf(lastEntry) : 'collection_point';
  // A boat verified by a truck operator's slip was never at a plant, so its sentence says so.
  const sentence = bt(state === 'verified' && lastMethod !== 'collection_point' ? 'sentenceVerifiedSlip' : seal.sentence);
  // The overdue sentence names 90 days, so its Malayalam only holds for the default window.
  const sentenceText = state === 'overdue' && overdueDays !== 90
    ? { en: `This boat has not logged emptying its sewage tank in the last ${overdueDays} days.`, ml: '' }
    : sentence;

  const place = lastMethod === 'collection_point' ? (lastSewage?.facilityName ?? lastEntry?.facilityMentioned ?? null) : null;
  const left = lastSewage ? overdueDays - lastSewage.daysAgo : 0;

  return (
    <Card className="mx-auto w-full max-w-xl px-5 pb-6 pt-7 sm:px-9 sm:pb-8 sm:pt-9" aria-labelledby="boat-name">
      <motion.div {...enter(0)} className="text-center">
        <Bi
          text={bt('recordLabel')}
          className="block text-caption font-semibold uppercase tracking-[0.12em] text-gold-ink"
          mlClassName="normal-case tracking-normal text-[1.05em]!"
        />
        <h1 id="boat-name" className="mt-2 font-display text-title font-semibold text-ink">
          {boat.name}
        </h1>
        <p className="mt-1 text-small text-ink-muted">
          Registration <span className="font-semibold tabular-nums tracking-[0.02em] text-ink">{boat.registration}</span>
        </p>
      </motion.div>

      <div className="my-5">
        <Divider />
      </div>

      <div className="flex flex-col items-center text-center">
        <Seal state={state} stamp className="size-36 sm:size-40" />
        <a href="#legend-heading" className="mt-2 min-h-11 content-center text-small font-semibold text-gold-ink underline underline-offset-4 lg:hidden">
          <Bi text={bt('sealHelp')} />
        </a>
        <motion.div {...enter(0.35)} className="mt-3">
          {lang === 'ml' && word.ml ? (
            <p lang="ml" className={`font-ml text-[1.75rem] font-semibold leading-tight ${seal.tone}`}>
              <span lang="en" className="sr-only">Status: </span>
              {word.ml}
            </p>
          ) : (
            <p lang="en" className={`font-display text-[2rem] font-semibold leading-none tracking-[-0.015em] ${seal.tone}`}>
              <span className="sr-only">Status: </span>
              {word.en}
            </p>
          )}
          {lang === 'both' && word.ml && (
            <p lang="ml" className={`mt-1.5 text-lead font-semibold ${seal.tone}`}>
              {word.ml}
            </p>
          )}
          {lang === 'ml' && sentenceText.ml ? (
            <p lang="ml" className="mx-auto mt-3 max-w-[38ch] font-ml text-body text-ink">
              {sentenceText.ml}
            </p>
          ) : (
            <p lang="en" className="mx-auto mt-3 max-w-[34ch] text-body text-ink">{sentenceText.en}</p>
          )}
          {lang === 'both' && sentenceText.ml && (
            <p lang="ml" className="mx-auto mt-1.5 max-w-[38ch] text-small text-ink-muted">
              {sentenceText.ml}
            </p>
          )}
        </motion.div>
      </div>

      <motion.div {...enter(0.45)}>
        <div className="my-6">
          <Divider />
        </div>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
          <Fact label="lastEmptied">
            {lastSewage ? (
              <>
                <span className="block font-semibold">{daysAgo(lastSewage.daysAgo)}</span>
                <span className="block text-small tabular-nums text-ink-muted">{formatDate(lastSewage.at)}</span>
              </>
            ) : (
              <span className="font-semibold">Never logged</span>
            )}
          </Fact>
          <Fact label="where">
            {lastMethod !== 'collection_point' ? (
              <>
                <span className="flex items-start gap-1.5 font-semibold">
                  <MethodIcon method={lastMethod} size={18} className="mt-[3px] text-gold-ink" />
                  <Bi text={bt(METHOD[lastMethod])} mlClassName="text-small" />
                </span>
                {lastEntry?.vehicleNumber && (
                  <span className="block text-small tabular-nums text-ink-muted [overflow-wrap:anywhere]">
                    <bdi>{lastEntry.vehicleNumber}</bdi>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="block font-semibold [overflow-wrap:anywhere]">{place ?? '—'}</span>
                {lastSewage && !lastSewage.facilityName && place && <span className="block text-small text-ink-muted">As the crew named it</span>}
              </>
            )}
          </Fact>
          <Fact label="lastEntryProof">{lastSewage ? <LevelChip level={lastSewage.level} stack /> : '—'}</Fact>
          <Fact label={state === 'overdue' ? 'overdueBy' : 'daysLeft'}>
            <DaysLeft state={state} left={left} overdueDays={overdueDays} hasSewage={!!lastSewage} daysSince={lastSewage?.daysAgo ?? null} />
          </Fact>
        </dl>

        <div className="mt-6 rounded-control bg-surface p-3.5">
          <ChainLine chain={chain} count={entries.length} />
        </div>
      </motion.div>
    </Card>
  );
}

function DaysLeft({ state, left, overdueDays, hasSewage, daysSince }: { state: BoatState; left: number; overdueDays: number; hasSewage: boolean; daysSince: number | null }) {
  if (state === 'overdue') {
    return (
      <>
        <Bi text={hasSewage && daysSince != null ? { en: bt('daysOverdue').en.replace('{days}', String(daysSince - overdueDays)), ml: bt('daysOverdue').ml.replace('{days}', String(daysSince - overdueDays)) } : bt('sealOverdue')} className="block font-semibold text-overdue" />
        <Bi text={{ en: bt('emptyEvery').en.replace('{days}', String(overdueDays)), ml: bt('emptyEvery').ml.replace('{days}', String(overdueDays)) }} className="block text-small text-ink-muted" />
      </>
    );
  }
  const pct = Math.max(4, Math.min(100, (left / overdueDays) * 100));
  return (
    <>
      <span className="flex items-baseline gap-1.5">
        <span className={`font-display text-[1.75rem] font-semibold leading-none tabular-nums ${SEAL[state].tone}`}>{left}</span>
        <span className="text-small text-ink-muted">of {overdueDays} days</span>
      </span>
      <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-pill bg-line">
        <motion.span
          className={`block h-full origin-left rounded-pill ${SEAL[state].soft}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.6 }}
        />
      </span>
    </>
  );
}

function ReportCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section aria-labelledby="report-heading" className="rounded-card bg-teak p-5 text-ink-inverse shadow-[var(--shadow-card)] sm:p-6">
      <h2 id="report-heading" className="font-display text-heading font-semibold">
        <Bi text={bt('reportPrompt')} mlClassName="mt-1 text-ink-inverse-muted opacity-100!" />
      </h2>
      <p className="mt-2 text-small text-ink-inverse-muted">
        Send a photo to the inspectors. A report is a claim they review. It does not change the seal by itself.
      </p>
      <Button className="mt-4" block onClick={onOpen}>
        <CameraIcon />
        <Bi text={bt('reportTitle')} className="text-start leading-tight" mlClassName="mt-0.5" />
      </Button>
    </section>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5a2 2 0 0 1 2-2h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

const LEGEND: { state: BoatState; text: string }[] = [
  { state: 'verified', text: 'The crew’s phone was at an open treatment plant when they logged emptying the sewage tank in the last 90 days.' },
  { state: 'declared', text: 'The crew logged it, but the phone was not at an open plant, or did not share its location.' },
  { state: 'overdue', text: 'No sewage emptying logged in the last 90 days. Boats must empty the tank every three months.' },
];

function Legend() {
  return (
    <section aria-labelledby="legend-heading" className="rounded-card border border-line bg-kasavu p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 id="legend-heading" className="font-display text-heading font-semibold text-ink">
        <Bi text={bt('howToRead')} />
      </h2>
      <ul className="mt-4 grid gap-4">
        {LEGEND.map(({ state, text }) => (
          <li key={state} className="flex items-start gap-3">
            <Seal state={state} className="size-10 shrink-0" />
            <div className="text-small">
              <Bi text={bt(SEAL[state].word)} className={`font-semibold ${SEAL[state].tone}`} />
              <p className="text-ink-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <ul className="mt-5 grid gap-2 border-t border-line pt-4">
        {(['receipt', 'location', 'declared'] as Level[]).map((level) => (
          <li key={level} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
            <LevelChip level={level} />
            <span>{LEVEL[level].meaning}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-start gap-3 border-t border-line pt-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-gold-ink ring-1 ring-line">
          <MethodIcon method="suction_truck" size={22} />
        </span>
        <div className="min-w-0 text-small">
          <Bi text={bt('legendTruckTitle')} className="font-semibold text-ink" />
          <Bi text={bt('legendTruckBody')} as="p" className="mt-1 text-ink-muted" mlClassName="mt-1 text-[0.95em]!" />
        </div>
      </div>
    </section>
  );
}

function HomeLink({ children }: { children: ReactNode }) {
  return (
    <a
      href="/"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-gold px-5 py-2.5 font-semibold text-teak shadow-[var(--shadow-button)] transition-[transform,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.96]"
    >
      {children}
    </a>
  );
}

function Missing({ id, boats }: { id: string; boats: BoatRecord[] }) {
  const lang = useLang();
  return (
    <Card className="mx-auto w-full max-w-xl px-5 py-8 text-center sm:px-9">
      <Seal state="unknown" ring="Kayal Log · No record found · Alappuzha · " className="mx-auto size-28" />
      <h1 className="mt-4 font-display text-title font-semibold text-ink">
        <Bi text={bt('notFound')} />
      </h1>
      <p className="mx-auto mt-3 max-w-[36ch] text-body text-ink">
        No boat with the code <span className="font-semibold [overflow-wrap:anywhere]">“{id}”</span> is registered with Kayal Log.
      </p>
      <p className="mx-auto mt-2 max-w-[36ch] text-small text-ink-muted">
        The QR code may be old or damaged. Ask the crew for the boat’s name, or pick it below.
      </p>
      {boats.length > 0 && (
        <ul className="mx-auto mt-6 grid max-w-sm gap-2 text-start">
          {boats.map((b) => (
            <li key={b.id}>
              <a
                href={`/boat/${encodeURIComponent(b.id)}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 py-2.5 transition-colors duration-150 hover:border-gold-edge"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{b.name}</span>
                  <span className="block text-caption tabular-nums text-ink-muted">{b.registration}</span>
                </span>
                <span className={`shrink-0 text-caption font-semibold ${SEAL[b.status.state].tone}`}>{pick(bt(SEAL[b.status.state].word), lang)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <HomeLink>
          <Bi text={bt('goHome')} className="leading-tight" mlClassName="mt-0.5" />
        </HomeLink>
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <Card className="mx-auto w-full max-w-xl px-5 py-8 sm:px-9" aria-labelledby="loading-label">
      <p id="loading-label" className="sr-only">
        Loading the boat record
      </p>
      <div className="flex animate-pulse flex-col items-center gap-3" aria-hidden="true">
        <span className="h-3 w-32 rounded-pill bg-line" />
        <span className="h-8 w-48 rounded-pill bg-line" />
        <span className="h-3 w-40 rounded-pill bg-line" />
        <span className="mt-6 size-36 rounded-full bg-line" />
        <span className="mt-3 h-7 w-28 rounded-pill bg-line" />
        <span className="h-3 w-64 max-w-full rounded-pill bg-line" />
      </div>
    </Card>
  );
}

export default function BoatPage() {
  const { boatId = '' } = useParams();
  const { load, retry } = useBoatRecord(boatId);
  const [reporting, setReporting] = useState(false);
  const closeReport = useCallback(() => setReporting(false), []);
  const titled = useRef(false);
  const [shareMessage, setShareMessage] = useState<'linkCopied' | 'shareFailed' | null>(null);

  useEffect(() => {
    if (!shareMessage) return;
    const timer = window.setTimeout(() => setShareMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage('linkCopied');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setShareMessage('shareFailed');
    }
  }

  useEffect(() => {
    if (load.status === 'ready' && !titled.current) {
      document.title = `${load.boat.name}: waste record · Kayal Log`;
      titled.current = true;
    } else if (load.status === 'missing') {
      document.title = 'Boat not found · Kayal Log';
    }
  }, [load]);

  const ready = load.status === 'ready' ? load : null;

  return (
    <AppShell
      headerEnd={
        ready && (
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill border border-ink-inverse/30 px-3.5 text-small max-[400px]:px-0 font-semibold text-ink-inverse transition-[border-color,transform] duration-150 hover:border-ink-inverse/70 active:scale-[0.96]"
          >
            <Bi text={bt('share')} />
          </button>
        )
      }
    >
      {shareMessage && <p role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-control bg-kasavu p-4 text-center text-ink shadow-raised"><Bi text={bt(shareMessage)} /></p>}
      <div className="relative px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-teak to-teak-deep" />
        <div className="relative">
          {load.status === 'loading' && <Skeleton />}
          {load.status === 'missing' && <Missing id={boatId} boats={load.boats} />}
          {load.status === 'error' && (
            <Card className="mx-auto w-full max-w-xl px-5 py-8 text-center sm:px-9">
              <h1 className="font-display text-heading font-semibold text-ink">This record did not load</h1>
              <p className="mx-auto mt-2 max-w-[36ch] text-body text-ink-muted">Check your connection and try again. {load.message}</p>
              <Button className="mt-5" onClick={retry}>
                Try again
              </Button>
            </Card>
          )}
          {ready && <Certificate boat={ready.boat} entries={ready.entries} chain={ready.chain} />}
        </div>
      </div>

      {ready && (
        <div className="surface-light bg-surface">
          <div className="mx-auto grid max-w-[76rem] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-8 lg:py-14">
            <div className="min-w-0">
              <div className="lg:hidden">
                <ReportCard onOpen={() => setReporting(true)} />
              </div>
              <section aria-labelledby="log-heading" className="mt-10 lg:mt-0">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <h2 id="log-heading" className="font-display text-title font-semibold text-ink">
                    <Bi text={bt('logTitle')} mlClassName="text-[0.6em]! mt-1" />
                  </h2>
                  <p className="pb-1 text-small tabular-nums text-ink-muted">
                    {ready.entries.length === 1 ? '1 entry' : `${ready.entries.length} entries`}, newest first
                  </p>
                </div>
                <Timeline entries={ready.entries} />
              </section>
            </div>
            <aside className="grid content-start gap-6 lg:sticky lg:top-6">
              <div className="hidden lg:block">
                <ReportCard onOpen={() => setReporting(true)} />
              </div>
              <Legend />
            </aside>
          </div>
        </div>
      )}

      {ready && <ReportSheet open={reporting} onClose={closeReport} boatId={ready.boat.id} boatName={ready.boat.name} />}
    </AppShell>
  );
}

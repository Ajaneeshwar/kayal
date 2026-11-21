import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import type { Text } from '../../i18n/index.ts';
import { useLang } from '../../i18n/language.ts';
import type { Boat, Entry, Facility, Report } from './api.ts';
import { KIND_LABELS, LEVEL_LABELS, LEVEL_TONE, METHOD_KEY, WASTE_LABELS, ago, daysAgo, whereText } from './format.ts';
import { MethodIcon, methodOf } from '../../components/MethodIcon.tsx';
import { d } from './i18n.ts';

export function PanelHead({ title, meta, children }: { title: Text; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-5">
      <div className="min-w-0">
        <Bi as="h2" text={title} className="font-display text-heading font-semibold" />
        {meta && <p className="mt-0.5 text-caption text-ink-muted">{meta}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`surface-light relative min-w-0 rounded-card border border-line bg-kasavu shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </section>
  );
}

function LevelChip({ level }: { level: Entry['verification']['level'] }) {
  const tone = LEVEL_TONE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2 py-0.5 text-caption font-semibold ${
        tone === 'verified' ? 'bg-verified-soft text-verified' : 'bg-declared-soft text-declared'
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tone === 'verified' ? 'bg-verified' : 'bg-declared'}`} />
      {LEVEL_LABELS[level]}
    </span>
  );
}

const KIND_GLYPH: Record<Entry['kind'], string> = {
  sewage_pumpout: 'M10 2.6c2.9 3.6 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2.1-5.4 5-9z',
  solid_waste: 'M4 6h12l-1 11H5zM7.5 6V4h5v2M3 6h14',
  engine_oil: 'M3 9h9l2-2h3v3l-5 6H3zM6 9V6h3',
};

/** Where the waste went. A truck, pump, collector or bin shows the method and vehicle, never a distance to a plant. */
function Where({ entry }: { entry: Entry }) {
  const method = methodOf(entry);
  if (method === 'collection_point') return <span className="text-caption text-ink-muted">{whereText(entry)}</span>;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-ink-muted">
      <MethodIcon method={method} size={15} className="text-gold-ink" />
      <Bi text={d(METHOD_KEY[method])} layout="inline" className="font-semibold text-ink" mlClassName="font-medium" />
      {entry.vehicleNumber && (
        <span className="inline-flex items-center gap-x-1.5">
          <span aria-hidden="true">·</span>
          <bdi className="font-semibold tabular-nums tracking-[0.02em] text-ink [overflow-wrap:anywhere]">{entry.vehicleNumber}</bdi>
        </span>
      )}
      {entry.handedTo && (
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
          <span aria-hidden="true">·</span>
          <Bi text={d('receivedBy')} layout="inline" />
          <bdi className="[overflow-wrap:anywhere]">{entry.handedTo}</bdi>
        </span>
      )}
    </span>
  );
}

function FeedItem({ entry, boat, fresh }: { entry: Entry; boat: Boat | undefined; fresh: boolean }) {
  const lang = useLang();
  // The crew's own words. The English setting shows only the English summary.
  const translated = lang !== 'en' && entry.heard && entry.heard.original !== entry.heard.english;
  return (
    <motion.li
      layout="position"
      initial={fresh ? { opacity: 0, y: -14, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.55, bounce: 0.18 }}
      className={`kl-feed-item relative rounded-control px-4 py-3.5 ${fresh ? 'is-fresh' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface text-wood ring-1 ring-line">
          <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <path d={KIND_GLYPH[entry.kind]} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-semibold">
              {boat ? (
                <a href={`/boat/${encodeURIComponent(boat.id)}`} className="hover:underline hover:decoration-gold-ink/60 hover:underline-offset-2">
                  {boat.name}
                </a>
              ) : (
                'Unknown boat'
              )}
            </p>
            <time dateTime={entry.at} title={new Date(entry.at).toLocaleString()} className="shrink-0 text-caption tabular-nums text-ink-muted">
              {fresh && <span className="me-1.5 font-semibold uppercase tracking-[0.06em] text-gold-ink">New</span>}
              {ago(entry.at)}
            </time>
          </div>
          <p className="text-small text-ink-muted">
            {KIND_LABELS[entry.kind]}
            {entry.quantity ? ` · ${entry.quantity}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <LevelChip level={entry.verification.level} />
            <Where entry={entry} />
          </div>
          {translated && (
            <p lang={entry.heard!.language} className="mt-2 border-s-2 border-gold-edge/60 ps-2.5 text-small text-ink-muted">
              {entry.heard!.original}
            </p>
          )}
          {entry.photo && (
            <a href={`/uploads/${entry.photo.file}`} target="_blank" rel="noopener" className="mt-2 flex items-center gap-2.5 text-caption text-ink-muted hover:text-ink">
              <img src={`/uploads/${entry.photo.file}`} alt="" loading="eager" className="kl-img h-16 w-12 shrink-0 rounded-md bg-white object-contain" />
              <span className="line-clamp-2">
                <span className="font-semibold text-ink">{entry.photo.isReceipt ? 'Receipt' : 'Photo'}</span>
                {entry.photo.caption ? ` · ${entry.photo.caption}` : ''}
              </span>
            </a>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function Feed({ entries, boats, fresh, link }: { entries: Entry[]; boats: Map<string, Boat>; fresh: ReadonlySet<string>; link: ReactNode }) {
  const shown = entries.slice(0, 40);
  return (
    <Panel className="flex min-h-0 flex-col">
      <PanelHead title={d('feedTitle')} meta={`${entries.length} recent entries, newest first`}>
        {link}
      </PanelHead>
      {shown.length === 0 ? (
        <p className="px-5 pb-6 text-small text-ink-muted">Nothing logged yet. Entries appear here as crews speak them.</p>
      ) : (
        <ol className="kl-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {shown.map((e) => (
              <FeedItem key={e.id} entry={e} boat={boats.get(e.boatId)} fresh={fresh.has(e.id)} />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </Panel>
  );
}

const URGENCY = { overdue: 0, declared: 1, verified: 2 } as const;

export function sortByUrgency(boats: Boat[]) {
  return [...boats].sort(
    (a, b) =>
      URGENCY[a.status.state] - URGENCY[b.status.state] ||
      (b.status.lastSewage?.daysAgo ?? Infinity) - (a.status.lastSewage?.daysAgo ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
}

function LastPump({ boat, window }: { boat: Boat; window: number }) {
  const last = boat.status.lastSewage;
  if (!last) return <span className="font-semibold text-overdue">Never logged</span>;
  const over = last.daysAgo - window;
  return (
    <span className="flex flex-col">
      <span className="tabular-nums">
        {daysAgo(last.daysAgo)}
        {over > 0 && <span className="ms-1.5 font-semibold text-overdue">{over} days over</span>}
      </span>
      <span className="break-words text-caption text-ink-muted">
        {LEVEL_LABELS[last.level]}
        {last.facilityName ? ` · ${last.facilityName}` : ''}
      </span>
    </span>
  );
}

export function BoatTable({ boats, window, onQr, freshBoats }: { boats: Boat[]; window: number; onQr: (b: Boat) => void; freshBoats: ReadonlySet<string> }) {
  return (
    <Panel>
      <PanelHead title={d('boatsTitle')} meta={`${boats.length} boats · a pump-out is due every ${window} days`} />
      <div className="relative overflow-x-auto px-2 pb-2">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-small">
          <thead>
            <tr className="text-start text-caption font-semibold uppercase tracking-[0.06em] text-ink-muted">
              <th className="px-3 pb-2 text-start font-semibold">Boat</th>
              <th className="px-3 pb-2 text-start font-semibold">Status</th>
              <th className="px-3 pb-2 text-start font-semibold">Last pump-out</th>
              <th className="px-3 pb-2 text-end font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {boats.map((b) => (
              <motion.tr layout="position" transition={{ type: 'spring', duration: 0.5, bounce: 0 }} key={b.id} className={`kl-row ${freshBoats.has(b.id) ? 'is-fresh' : ''}`}>
                <td className="border-t border-line px-3 py-3">
                  <a href={`/boat/${encodeURIComponent(b.id)}`} className="group block">
                    <span className="block font-semibold group-hover:underline group-hover:decoration-gold-ink/60 group-hover:underline-offset-2">{b.name}</span>
                    <span className="block text-caption tabular-nums text-ink-muted">{b.registration}</span>
                  </a>
                </td>
                <td className="border-t border-line px-3 py-3">
                  <StatusBadge state={b.status.state} />
                </td>
                <td className="max-w-[16rem] border-t border-line px-3 py-3">
                  <LastPump boat={b} window={window} />
                </td>
                <td className="border-t border-line px-3 py-3 text-end">
                  <span className="inline-flex gap-1">
                    <a
                      href={`/boat/${encodeURIComponent(b.id)}`}
                      className="inline-flex min-h-9 items-center rounded-control px-3 text-caption font-semibold text-gold-ink transition-colors duration-150 hover:bg-gold/15"
                    >
                      Record
                    </a>
                    <button
                      type="button"
                      onClick={() => onQr(b)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line px-3 text-caption font-semibold transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.96]"
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
                        <path d="M2 2h5v5H2zm1.5 1.5v2h2v-2zM9 2h5v5H9zm1.5 1.5v2h2v-2zM2 9h5v5H2zm1.5 1.5v2h2v-2zM9 9h2v2H9zm3 0h2v2h-2zm-3 3h2v2H9zm3 0h2v2h-2z" />
                      </svg>
                      QR
                    </button>
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Points({ facilities, busy, onToggle, onAdd }: { facilities: Facility[]; busy: ReadonlySet<string>; onToggle: (f: Facility) => void; onAdd: () => void }) {
  const openCount = facilities.filter((f) => f.open).length;
  return (
    <Panel>
      <PanelHead title={d('pointsTitle')} meta={`${openCount} of ${facilities.length} open`}>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-control px-2.5 text-caption font-semibold text-gold-ink transition-colors duration-150 hover:bg-gold/15"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add
        </button>
      </PanelHead>
      <ul className="px-2 pb-3">
        {facilities.map((f) => (
          <li key={f.id} className="flex flex-col items-start gap-2 rounded-control px-3 py-2.5">
            <div className="w-full min-w-0">
              <p className="text-pretty break-words font-semibold leading-snug">{f.name}</p>
              <p className="text-caption text-ink-muted">{f.accepts.map((a) => WASTE_LABELS[a]).join(', ')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={f.open}
              aria-label={`${f.name} is ${f.open ? 'open' : 'closed'}. Mark it ${f.open ? 'closed' : 'open'}`}
              disabled={busy.has(f.id)}
              onClick={() => onToggle(f)}
              className={`kl-switch group inline-flex min-h-9 shrink-0 items-center gap-2 rounded-pill border py-1 pe-3 ps-1 text-caption font-semibold transition-[background-color,border-color,color,opacity] duration-200 disabled:opacity-60 ${
                f.open ? 'border-gold-edge bg-gold/20 text-ink' : 'border-line bg-surface text-ink-muted'
              }`}
            >
              <span aria-hidden="true" className={`relative block h-6 w-10 shrink-0 rounded-pill transition-colors duration-200 ${f.open ? 'bg-gold-ink' : 'bg-line'}`}>
                <span
                  className={`absolute left-0.5 top-0.5 block size-5 rounded-full bg-kasavu shadow-sm transition-transform duration-200 ease-[var(--ease-out)] ${
                    f.open ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
              <Bi text={d(f.open ? 'open' : 'closed')} layout="inline" className="min-w-0" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function Reports({ reports, boats, busy, onReview }: { reports: Report[] | null | undefined; boats: Map<string, Boat>; busy: ReadonlySet<string>; onReview: (r: Report) => void }) {
  const list = reports ? [...reports].sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || (b.at ?? '').localeCompare(a.at ?? '')) : [];
  const open = list.filter((r) => !r.reviewed).length;
  return (
    <Panel>
      <PanelHead title={d('reportsTitle')} meta={reports === null ? 'Reports are not available on this server yet' : reports ? `${open} waiting for review` : 'Loading'} />
      {reports && list.length === 0 && <p className="px-5 pb-5 text-small text-ink-muted">No reports from guests yet.</p>}
      {list.length > 0 && (
        <ul className="space-y-2 px-3 pb-3">
          {list.map((r) => (
            <li key={r.id} className={`flex gap-3 rounded-control border border-line p-3 transition-opacity duration-200 ${r.reviewed ? 'opacity-60' : 'bg-surface/60'}`}>
              {r.photoUrl ? (
                <a href={r.photoUrl} target="_blank" rel="noopener" className="shrink-0">
                  <img src={r.photoUrl} alt="Photo sent by a guest" loading="lazy" className="kl-img size-16 rounded-md object-cover" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="break-words font-semibold">{(r.boatId && boats.get(r.boatId)?.name) || r.boatId || <Bi text={d('unlinkedReport')} />}</p>
                  {r.at && <span className="shrink-0 text-caption text-ink-muted">{ago(r.at)}</span>}
                </div>
                {r.wasteSeen !== null && (
                  <span className={`mb-1 inline-flex rounded-pill px-2 py-0.5 text-caption font-semibold ${r.wasteSeen ? 'bg-overdue-soft text-overdue' : 'bg-surface text-ink-muted ring-1 ring-line'}`}>
                    {r.wasteSeen ? 'Looks like waste in the water' : 'No waste seen in the photo'}
                  </span>
                )}
                {r.text && <p className="line-clamp-3 text-small">{r.text}</p>}
                {r.reading && (
                  <p className="mt-1 text-caption text-ink-muted">
                    <span className="font-semibold text-gold-ink">Model reading:</span> {r.reading}
                  </p>
                )}
                <div className="mt-2">
                  {r.reviewed ? (
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-ink-muted">
                      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2.5 6.2l2.2 2.2 4.8-5" />
                      </svg>
                      Reviewed
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy.has(r.id)}
                      onClick={() => onReview(r)}
                      className="inline-flex min-h-9 items-center rounded-control border border-gold-edge bg-kasavu px-3 text-caption font-semibold transition-[background-color,transform] duration-150 hover:bg-gold/15 active:scale-[0.96] disabled:opacity-60"
                    >
                      Mark reviewed
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

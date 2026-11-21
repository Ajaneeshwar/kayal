import { Bi } from '../../components/Bi.tsx';
import { useLang } from '../../i18n/language.ts';
import { bt, formatDate, formatTime, KIND, LEVEL, reasonText, type Entry, type Level } from './data.ts';

const CHIP: Record<'verified' | 'declared', string> = {
  verified: 'bg-verified-soft text-verified',
  declared: 'bg-declared-soft text-declared',
};

const DOT: Record<'verified' | 'declared', string> = {
  verified: 'bg-verified',
  declared: 'bg-declared',
};

function LevelIcon({ level }: { level: Level }) {
  const s = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (level === 'receipt')
    return (
      <svg {...s}>
        <path d="M4 1.8h8v12.4l-2-1.2-2 1.2-2-1.2-2 1.2z" />
        <path d="M6.2 6.6l1.3 1.3 2.4-2.6" />
      </svg>
    );
  if (level === 'location')
    return (
      <svg {...s}>
        <path d="M8 14.2s4.6-4.3 4.6-7.8a4.6 4.6 0 1 0-9.2 0c0 3.5 4.6 7.8 4.6 7.8z" />
        <circle cx="8" cy="6.4" r="1.6" />
      </svg>
    );
  return (
    <svg {...s}>
      <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7l-3 2.5v-2.5a1.5 1.5 0 0 1-1.5-1.5z" />
    </svg>
  );
}

/** The proof level as a chip: icon, English and Malayalam. `stack` puts the Malayalam under it for narrow spaces. */
export function LevelChip({ level, stack = false }: { level: Level; stack?: boolean }) {
  const { key, tone } = LEVEL[level];
  const lang = useLang();
  // Both languages on one line run past a 360 px screen, so the mixed setting always stacks.
  if (stack || (lang === 'both' && bt(key).ml)) {
    return (
      <span className={`inline-flex items-start gap-1.5 rounded-control px-2.5 py-1.5 text-caption font-semibold ${CHIP[tone]}`}>
        <span className="mt-[3px]">
          <LevelIcon level={level} />
        </span>
        <Bi text={bt(key)} className="leading-tight" mlClassName="mt-0.5 text-[0.95em]! opacity-85!" />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-caption font-semibold ${CHIP[tone]}`}>
      <LevelIcon level={level} />
      <Bi text={bt(key)} layout="inline" className="flex-nowrap!" mlClassName="text-[0.95em]! opacity-85!" />
    </span>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0">
      <path d="M8 14.2s4.6-4.3 4.6-7.8a4.6 4.6 0 1 0-9.2 0c0 3.5 4.6 7.8 4.6 7.8z" />
      <circle cx="8" cy="6.4" r="1.6" />
    </svg>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const { level, facilityName } = entry.verification;
  const place = facilityName ?? entry.facilityMentioned;
  const lang = useLang();
  // The crew's own words. The English setting shows only the English summary.
  const translated = lang !== 'en' && entry.heard.original.trim() !== entry.heard.english.trim();
  const photo = entry.photo;
  return (
    <article className="rounded-card border border-line bg-kasavu p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-small text-ink-muted tabular-nums">
          <time dateTime={entry.at}>
            {formatDate(entry.at)} <span aria-hidden="true">·</span> {formatTime(entry.at)}
          </time>
        </p>
        <LevelChip level={level} />
      </div>

      <Bi as="h3" text={bt(KIND[entry.kind])} className="mt-2 font-display text-heading font-semibold text-ink" />

      <dl className="mt-3 grid gap-2 text-body text-ink">
        {entry.quantity && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <dt className="sr-only">Quantity</dt>
            <dd className="font-semibold tabular-nums">{entry.quantity}</dd>
            {entry.corrected && (
              <dd
                className="inline-flex items-center gap-1 rounded-pill border border-gold-edge/60 px-2 py-0.5 text-caption font-semibold text-gold-ink"
                title={entry.correctedAt ? `Corrected by the crew on ${formatDate(entry.correctedAt)} at ${formatTime(entry.correctedAt)}` : undefined}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.6 2.6l2.8 2.8L6 12.8l-3.4.6.6-3.4z" />
                </svg>
                <Bi text={bt('corrected')} layout="inline" className="flex-nowrap!" mlClassName="text-[0.95em]!" />
              </dd>
            )}
          </div>
        )}
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Place</dt>
          <PinIcon />
          <dd>{place ?? <span className="text-ink-muted">No place named</span>}</dd>
        </div>
      </dl>

      <p className="mt-2 text-small text-ink-muted">{reasonText(entry)}</p>

      {translated && (
        <p lang={entry.heard.language.split('-')[0]} className="mt-3 border-s-2 border-gold-edge/60 ps-3 text-small text-ink-muted">
          “{entry.heard.original}”
        </p>
      )}

      {photo && (
        <a
          href={`/uploads/${encodeURIComponent(photo.file)}`}
          target="_blank"
          rel="noopener"
          className="group mt-4 flex items-center gap-3 rounded-control p-1 -m-1"
        >
          <img
            src={`/uploads/${encodeURIComponent(photo.file)}`}
            alt={photo.isReceipt ? 'Receipt photo for this entry' : 'Photo for this entry'}
            loading="lazy"
            className="size-16 shrink-0 rounded-[0.5rem] object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0/0.1)]"
          />
          <span className="min-w-0 text-small">
            {photo.isReceipt ? (
              <Bi text={bt('receiptPhoto')} className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 group-hover:decoration-ink" />
            ) : (
              <span className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 group-hover:decoration-ink">Photo</span>
            )}
            {(photo.issuer || photo.caption) && (
              <span className="mt-0.5 block text-ink-muted [overflow-wrap:anywhere]">{[photo.issuer, photo.amount].filter(Boolean).join(' · ') || photo.caption}</span>
            )}
          </span>
        </a>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-caption text-ink-muted">
        <span className="font-mono tabular-nums" title={`Entry seal ${entry.hash}`}>
          #{entry.hash.slice(0, 10)}
        </span>
        {entry.source === 'sample' && <span>Sample entry</span>}
      </p>
    </article>
  );
}

export function Timeline({ entries }: { entries: Entry[] }) {
  if (!entries.length) {
    return (
      <p className="rounded-card border border-dashed border-field-border/60 p-6 text-body text-ink-muted">
        Nothing logged yet. Entries appear here as soon as the crew records a handover.
      </p>
    );
  }
  return (
    <ol className="relative grid gap-4">
      <span aria-hidden="true" className="absolute inset-y-3 start-[0.6875rem] w-px bg-gold-edge/60" />
      {entries.map((entry) => (
        <li key={entry.id} className="relative min-w-0 ps-9">
          <span
            aria-hidden="true"
            className={`absolute start-1 top-5 size-[0.875rem] rounded-full ring-4 ring-surface ${DOT[LEVEL[entry.verification.level].tone]}`}
          />
          <EntryCard entry={entry} />
        </li>
      ))}
    </ol>
  );
}

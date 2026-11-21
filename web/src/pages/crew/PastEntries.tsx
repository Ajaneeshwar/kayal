import { useEffect, useId, useRef, useState } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { ShowMore, usePaged } from '../../components/ShowMore.tsx';
import { usePick } from '../../i18n/language.ts';
import { methodOf } from '../../components/MethodIcon.tsx';
import { bt, fetchBoat, formatDate, formatTime, KIND, METHOD, namedReceiver, shownLevel, type Entry } from '../boat/data.ts';
import { LevelChip, ReceiverAnswer } from '../boat/Timeline.tsx';
import { entryPlace } from '../boat/entryPlace.ts';
import { t } from './i18n.ts';

/** The receiver can confirm for 3 days after the handover, as the operator page allows. */
const CONFIRM_WINDOW_MS = 72 * 3_600_000;

/** The code to show the receiver, while they can still confirm. */
function openCode(entry: Entry, now: number): string | null {
  if (!entry.handoverCode || entry.voided || entry.confirmation || methodOf(entry) === 'waste_bin') return null;
  return now - Date.parse(entry.at) < CONFIRM_WINDOW_MS ? entry.handoverCode.toUpperCase() : null;
}

export function PastEntries({ boatId, revision, onClose }: { boatId: string; revision: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pick = usePick();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { shown, hidden, more } = usePaged(entries ?? []);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setEntries(null);
    setFailed(false);
    fetchBoat(boatId, controller.signal).then(({ entries: next }) => {
      setEntries(next.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
    }, () => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [boatId, revision, attempt]);
  return (
    <dialog ref={dialog} aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} className="surface-light m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-card border border-gold-edge bg-kasavu p-4 text-ink shadow-raised backdrop:bg-teak-deep/70 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Bi id={titleId} as="h2" text={t('pastEntries')} className="font-display text-heading font-semibold" />
        <button type="button" aria-label={pick(t('pastClose'))} onClick={onClose} className="min-h-11 rounded-control px-3 text-small font-semibold underline"><Bi text={t('pastClose')} /></button>
      </div>
      {!entries && !failed && <p role="status"><Bi text={t('pastLoading')} /></p>}
      {failed && <div role="alert"><Bi text={t('pastError')} /><button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 min-h-11 rounded-control bg-gold px-4 font-semibold text-teak"><Bi text={t('pastRetry')} /></button></div>}
      {entries?.length === 0 && <p><Bi text={t('pastEmpty')} /></p>}
      <ol className="space-y-3">
        {shown.map((entry) => {
          const method = methodOf(entry);
          const place = entryPlace(entry);
          const receiver = namedReceiver(entry);
          const code = openCode(entry, Date.now());
          return (
            <li key={entry.id} className="rounded-control border border-line bg-surface p-4">
              <time dateTime={entry.at} className="text-caption text-ink-muted">{formatDate(entry.at)} · {formatTime(entry.at)}</time>
              <Bi as="h3" text={bt(KIND[entry.kind])} className={`mt-1 font-semibold ${entry.voided ? 'line-through decoration-ink-muted/80' : ''}`} />
              {entry.quantity && <p className="mt-1 font-semibold">{entry.quantity}</p>}
              <Bi text={bt(METHOD[method])} className="mt-2 text-small font-semibold" />
              <p className="mt-1 break-words text-small text-ink-muted">{place ?? <Bi text={bt('noPlaceNamed')} />}</p>
              {entry.vehicleNumber && <p className="mt-1 break-words text-small"><Bi text={bt('vehicle')} layout="inline" />: {entry.vehicleNumber}</p>}
              {receiver && <p className="mt-1 break-words text-small"><Bi text={bt('receivedBy')} layout="inline" />: {receiver}</p>}
              {entry.voided ? (
                <Bi text={entry.voidReason ? { en: bt('withdrawnBy').en.replace('{reason}', entry.voidReason), ml: bt('withdrawnBy').ml.replace('{reason}', entry.voidReason) } : bt('withdrawnNoReason')} className="mt-2 block text-small font-semibold [overflow-wrap:anywhere]" />
              ) : (
                <>
                  <div className="mt-2"><LevelChip level={shownLevel(entry)} /></div>
                  {entry.confirmation && <div className="mt-2"><ReceiverAnswer answer={entry.confirmation} compact /></div>}
                  {code && (
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-small">
                      <Bi text={bt('handoverCode')} layout="inline" className="text-ink-muted" />
                      <span className="font-semibold tabular-nums tracking-[0.2em]">{code}</span>
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
      <ShowMore hidden={hidden} onMore={more} className="mt-3" />
    </dialog>
  );
}

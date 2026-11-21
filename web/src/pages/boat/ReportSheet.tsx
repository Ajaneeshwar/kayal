import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { bt, currentPosition, photoToDataUri, sendReport } from './data.ts';

type Position = { lat: number; lon: number; accuracy: number };
type Locating = 'off' | 'finding' | 'found' | 'failed';

interface Props {
  open: boolean;
  onClose: () => void;
  boatId: string;
  boatName: string;
}

const NOTE_MAX = 300;

export function ReportSheet({ open, onClose, boatId, boatName }: Props) {
  return (
    <AnimatePresence>
      {open && <Sheet key="sheet" onClose={onClose} boatId={boatId} boatName={boatName} />}
    </AnimatePresence>
  );
}

function Sheet({ onClose, boatId, boatName }: Omit<Props, 'open'>) {
  const titleId = useId();
  const photoErrorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [share, setShare] = useState(true);
  const [locating, setLocating] = useState<Locating>('off');
  const [position, setPosition] = useState<Position | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [sendError, setSendError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Lock the page behind, focus the heading, close on Escape, and give focus back on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!share) {
      setLocating('off');
      setPosition(null);
      return;
    }
    let live = true;
    setLocating('finding');
    currentPosition().then((p) => {
      if (!live) return;
      setPosition(p);
      setLocating(p ? 'found' : 'failed');
    });
    return () => {
      live = false;
    };
  }, [share]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSendError('');
    if (!file) {
      setPhotoError('Add a photo of what you saw. The inspector needs it to review the report.');
      fileRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const photoDataUri = await photoToDataUri(file);
      await sendReport({
        boatId,
        photoDataUri,
        note: note.trim() || null,
        location: share && position ? position : null,
      });
      setSent(true);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-teak-deep/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface-light relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-card border border-gold-edge/70 bg-kasavu pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-raised)] sm:max-w-md sm:rounded-card"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
        transition={{ type: 'spring', duration: 0.45, bounce: 0 }}
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-pill bg-line sm:hidden" />
        <div className="px-5 pt-4 sm:px-6 sm:pt-6">
          {sent ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-verified-soft text-verified">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 ref={headingRef} id={titleId} tabIndex={-1} className="mt-4 font-display text-title font-semibold text-ink outline-none">
                <Bi text={bt('reportSent')} />
              </h2>
              <p className="mx-auto mt-3 max-w-[32ch] text-body text-ink">
                Thank you. An inspector will look at your photo of {boatName}.
              </p>
              <p className="mx-auto mt-2 max-w-[34ch] text-small text-ink-muted">
                A report is a claim until an inspector reviews it, so it does not change this boat’s seal.
              </p>
              <Button block className="mt-6" onClick={onClose}>
                Back to the record
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="flex items-start justify-between gap-4">
                <h2 ref={headingRef} id={titleId} tabIndex={-1} className="font-display text-heading font-semibold text-ink outline-none">
                  <Bi text={bt('reportTitle')} />
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close the report form"
                  className="-me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-small text-ink-muted">
                Seen waste from <span className="font-semibold text-ink">{boatName}</span> going into the water? Send a photo and an inspector will review it.
              </p>

              <label className="mt-5 block">
                <span className="text-small font-semibold text-ink">Photo</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-invalid={photoError ? true : undefined}
                  aria-describedby={photoError ? photoErrorId : undefined}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setPhotoError('');
                  }}
                />
                <span
                  className={`mt-1.5 flex min-h-28 cursor-pointer items-center gap-4 rounded-control border-[1.5px] border-dashed p-3 transition-colors duration-150 hover:bg-surface [:focus-visible+&]:outline-3 [:focus-visible+&]:outline-offset-2 [:focus-visible+&]:outline-focus ${
                    photoError ? 'border-overdue' : 'border-field-border'
                  }`}
                >
                  {preview ? (
                    <img src={preview} alt="The photo you chose" className="size-20 shrink-0 rounded-[0.5rem] object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0/0.1)]" />
                  ) : (
                    <span className="grid size-20 shrink-0 place-items-center rounded-[0.5rem] bg-surface text-gold-ink">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 8.5a2 2 0 0 1 2-2h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                    </span>
                  )}
                  <span className="text-small">
                    <span className="block font-semibold text-ink">{file ? 'Change the photo' : 'Take or choose a photo'}</span>
                    <span className="block text-ink-muted">{file ? file.name : 'Show the boat and the water if you can.'}</span>
                  </span>
                </span>
              </label>
              {photoError && (
                <p id={photoErrorId} className="mt-1.5 text-small font-semibold text-overdue">
                  {photoError}
                </p>
              )}

              <label className="mt-4 block">
                <span className="flex items-baseline justify-between text-small">
                  <span className="font-semibold text-ink">
                    Note <span className="font-normal text-ink-muted">(optional)</span>
                  </span>
                  <span className="tabular-nums text-ink-muted">{NOTE_MAX - note.length}</span>
                </span>
                <textarea
                  value={note}
                  maxLength={NOTE_MAX}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For example: grey water from the back of the boat near Punnamada jetty, around 5 pm"
                  className="mt-1.5 block w-full resize-none rounded-control border border-field-border bg-kasavu px-3 py-2.5 text-ink placeholder:text-ink-muted/70"
                />
              </label>

              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-gold-ink)]" />
                <span className="text-small">
                  <span className="block font-semibold text-ink">Share my location</span>
                  <span className="block text-ink-muted" aria-live="polite">
                    {locating === 'off' && 'The inspector will not know where you saw it.'}
                    {locating === 'finding' && 'Finding your location…'}
                    {locating === 'found' && position && `Location found, accurate to about ${position.accuracy} m.`}
                    {locating === 'failed' && 'Your location is not available. You can still send the report.'}
                  </span>
                </span>
              </label>

              {sendError && (
                <p role="alert" className="mt-4 rounded-control bg-overdue-soft px-3 py-2.5 text-small font-semibold text-overdue">
                  {sendError}
                </p>
              )}

              <Button type="submit" block busy={busy} className="mt-5">
                <Bi text={bt('sendReport')} className="leading-tight" mlClassName="mt-0.5" />
              </Button>
              <p className="mt-3 text-center text-caption text-ink-muted">A report is a claim. An inspector reviews it before anything changes.</p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

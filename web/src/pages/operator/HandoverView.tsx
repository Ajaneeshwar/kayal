import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { MethodIcon, methodOf } from '../../components/MethodIcon.tsx';
import { ApiError, confirmEntry, type BoatRef, type Confirmation, type Decision, type Entry, type Session } from './api.ts';
import { fill, t, type Pair } from './i18n.ts';
import type { OperatorKey } from './strings.ts';
import { ago, dayTime, Field, Icon, INPUT, KIND, LevelChip, METHOD } from './ui.tsx';

const EASE = [0.23, 1, 0.32, 1] as const;

function Row({ label, children }: { label: OperatorKey; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-caption text-ink-muted">
        <Bi text={t(label)} />
      </dt>
      <dd className="min-w-0 text-body text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** What the crew logged: the boat, the waste, how it left the boat and when. */
export function EntrySummary({ entry, boat, now }: { entry: Entry; boat: BoatRef | undefined; now: number }) {
  const method = methodOf(entry);
  const heading = useRef<HTMLHeadingElement>(null);
  // The card that was tapped is gone, so focus starts at the boat's name.
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <Card className="p-5">
      <Bi text={t('handoverFrom')} className="text-caption font-semibold text-gold-ink" />
      <h2 ref={heading} tabIndex={-1} className="mt-0.5 font-display text-title font-semibold text-ink [overflow-wrap:anywhere] focus:outline-none">
        {boat?.name ?? entry.boatId}
      </h2>
      {boat && <p className="text-small tabular-nums text-ink-muted">{boat.registration}</p>}
      <dl className="mt-4 divide-y divide-line border-t border-line pt-3">
        <Row label="waste">
          <Bi text={t(KIND[entry.kind])} className="font-semibold" />
        </Row>
        <Row label="crewSaid">
          {entry.quantity ? <span className="font-semibold tabular-nums">{entry.quantity}</span> : <Bi text={t('notSaid')} className="text-ink-muted" />}
        </Row>
        <Row label="how">
          <span className="flex items-start gap-2">
            <MethodIcon method={method} size={18} className="mt-0.5 text-gold-ink" />
            <Bi text={t(METHOD[method])} />
          </span>
        </Row>
        {entry.vehicleNumber && (
          <Row label="vehicle">
            <span className="font-semibold tabular-nums">{entry.vehicleNumber}</span>
          </Row>
        )}
        {entry.handedTo && <Row label="namedReceiver">{entry.handedTo}</Row>}
        <Row label="when">
          <Bi text={ago(entry.at, now)} mlClassName="text-small!" />
          <span className="block text-small tabular-nums text-ink-muted">{dayTime(entry.at)}</span>
        </Row>
        <Row label="proofNow">
          <LevelChip level={entry.verification.level} />
        </Row>
      </dl>
    </Card>
  );
}

type SaveProblem = Extract<OperatorKey, 'qtyInvalid' | 'conflict' | 'forbidden' | 'notFound' | 'saveFailed'>;

function problemFor(err: unknown): SaveProblem {
  if (!(err instanceof ApiError)) return 'saveFailed';
  if (err.status === 400) return 'qtyInvalid';
  if (err.status === 403) return 'forbidden';
  if (err.status === 404) return 'notFound';
  if (err.status === 409) return 'conflict';
  return 'saveFailed';
}

/** The receiver's answer: received, with the amount, or not received behind a second step. */
export function ConfirmForm({
  entry,
  session,
  onDone,
  onExpired,
}: {
  entry: Entry;
  session: Session;
  onDone: (entry: Entry, confirmation: Confirmation) => void;
  onExpired: () => void;
}) {
  const id = useId();
  const [quantity, setQuantity] = useState(entry.quantity ?? '');
  const [note, setNote] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const disputeTitle = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const returning = useRef(false);
  const disputingNow = useRef(disputing);
  disputingNow.current = disputing;

  // The panels swap after the old one has faded out, so focus moves once the new one is in.
  function focusPanel() {
    requestAnimationFrame(() => {
      if (disputingNow.current) disputeTitle.current?.focus();
      else if (returning.current) card.current?.querySelector<HTMLButtonElement>('[data-not-received]')?.focus();
    });
  }

  async function send(decision: Decision) {
    if (busy) return;
    const qty = quantity.trim();
    if (decision === 'received' && qty && !/\d/.test(qty)) {
      setProblem('qtyInvalid');
      return;
    }
    setBusy(decision);
    setProblem(null);
    try {
      const body = {
        decision,
        ...(decision === 'received' && qty ? { quantity: qty } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const result = await confirmEntry(session, entry.id, body);
      onDone(result.entry, result.confirmation);
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError && err.status === 401) return onExpired();
      // A rejected quantity matters only to the received answer.
      const p = problemFor(err);
      setProblem(p === 'qtyInvalid' && decision === 'not_received' ? 'saveFailed' : p);
    }
  }

  function receive(e: FormEvent) {
    e.preventDefault();
    send('received');
  }

  const qtyProblem = problem === 'qtyInvalid';
  const general = problem && !qtyProblem ? t(problem) : null;

  return (
    <Card className="mt-4 p-5">
      <div ref={card}>
      <AnimatePresence mode="wait" initial={false} onExitComplete={focusPanel}>
        {!disputing ? (
          <motion.form
            key="receive"
            onSubmit={receive}
            noValidate
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-col gap-4"
          >
            <Field id={`${id}-qty`} label={t('qtyLabel')} help={t('qtyHelp')} error={qtyProblem ? t('qtyInvalid') : null}>
              <input
                id={`${id}-qty`}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (qtyProblem) setProblem(null);
                }}
                maxLength={80}
                inputMode="text"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="300 litres"
                aria-invalid={qtyProblem || undefined}
                aria-describedby={`${id}-qty-help ${id}-qty-error`}
                className={`${INPUT} font-semibold tabular-nums`}
              />
            </Field>
            <Field id={`${id}-note`} label={t('noteLabel')}>
              <textarea
                id={`${id}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={2}
                className={`${INPUT} h-auto min-h-12 resize-none py-3`}
              />
            </Field>
            {general && <ProblemLine text={general} />}
            <Button type="submit" block busy={busy === 'received'} disabled={busy !== null} className="min-h-14 text-lead">
              <Icon.Check size={22} className="shrink-0" />
              <Bi text={t('received')} className="text-start leading-tight" mlClassName="mt-0.5 text-small! font-medium text-teak/75" />
            </Button>
            <Button
              data-not-received
              variant="secondary"
              block
              disabled={busy !== null}
              onClick={() => {
                setProblem(null);
                setDisputing(true);
              }}
            >
              <Icon.Cross size={18} className="shrink-0" />
              <Bi text={t('notReceived')} className="text-start leading-tight" mlClassName="mt-0.5 font-medium opacity-75" />
            </Button>
          </motion.form>
        ) : (
          <motion.div
            key="dispute"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-col gap-4"
          >
            <div className="border-s-[3px] border-ink ps-3">
              <h3 ref={disputeTitle} tabIndex={-1} className="font-display text-heading font-semibold text-ink focus:outline-none">
                <Bi text={t('disputeTitle')} mlClassName="mt-0.5 text-body! text-ink-muted" />
              </h3>
              <Bi as="p" text={t('disputeBody')} className="mt-2 text-small text-ink-muted" mlClassName="mt-1" />
            </div>
            <Field id={`${id}-why`} label={t('disputeNoteLabel')}>
              <textarea
                id={`${id}-why`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={2}
                className={`${INPUT} h-auto min-h-12 resize-none py-3`}
              />
            </Field>
            {general && <ProblemLine text={general} />}
            <button
              type="button"
              onClick={() => send('not_received')}
              disabled={busy !== null}
              aria-busy={busy === 'not_received' || undefined}
              className="relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-5 py-2.5 font-semibold text-kasavu
                transition-[scale,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] enabled:active:scale-[0.96] disabled:opacity-55"
            >
              <span className={`inline-flex items-center gap-2 ${busy === 'not_received' ? 'opacity-0' : ''}`}>
                <Bi text={t('disputeConfirm')} className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-80" />
              </span>
              {busy === 'not_received' && (
                <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                  <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                </span>
              )}
            </button>
            <Button
              variant="secondary"
              block
              disabled={busy !== null}
              onClick={() => {
                returning.current = true;
                setProblem(null);
                setDisputing(false);
              }}
            >
              <Bi text={t('cancel')} className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-75" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </Card>
  );
}

function ProblemLine({ text }: { text: Pair }) {
  return (
    <div role="alert" className="rounded-control bg-overdue-soft px-4 py-3 text-small text-overdue">
      <Bi text={text} />
    </div>
  );
}

/** A violet office stamp with a tick: the receiver's own mark on the record. */
function ConfirmedSeal() {
  return (
    <svg viewBox="0 0 120 120" className="size-28 -rotate-6 text-confirmed" aria-hidden="true">
      <circle cx="60" cy="60" r="56" className="fill-confirmed-soft" stroke="currentColor" strokeWidth="4" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
      <path d="M40 61.5l13 13L81 46" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotReceivedMark() {
  return (
    <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-declared-soft text-declared">
      <Icon.Cross size={34} strokeWidth={2.5} />
    </span>
  );
}

/** After the answer is saved: the new level, what was recorded, and the way back. */
export function Result({
  entry,
  confirmation,
  boat,
  onBack,
}: {
  entry: Entry;
  confirmation: Confirmation;
  boat: BoatRef | undefined;
  onBack: () => void;
}) {
  const received = confirmation.decision === 'received';
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  return (
    <Card className="p-6 text-center">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
        >
          {received ? <ConfirmedSeal /> : <NotReceivedMark />}
        </motion.div>
        <h2 ref={title} tabIndex={-1} className={`mt-4 font-display text-title font-semibold focus:outline-none ${received ? 'text-confirmed' : 'text-ink'}`}>
          <Bi text={t(received ? 'doneTitle' : 'disputedTitle')} mlClassName="mt-1 text-heading!" />
        </h2>
        <div className="mt-3">
          <LevelChip level={entry.verification.level} />
        </div>
        <Bi as="p" text={t(received ? 'doneBody' : 'disputedBody')} className="mt-3 max-w-[30ch] text-small text-ink-muted" mlClassName="mt-1" />
      </div>
      <dl className="mt-5 divide-y divide-line border-y border-line text-start">
        <Row label="handoverFrom">
          <span className="font-semibold">{boat?.name ?? entry.boatId}</span>
        </Row>
        <Row label="waste">
          <Bi text={t(KIND[entry.kind])} />
        </Row>
        {received && (
          <Row label="doneReceived">
            {confirmation.quantity ?? entry.quantity ? (
              <span className="font-semibold tabular-nums">{confirmation.quantity ?? entry.quantity}</span>
            ) : (
              <Bi text={t('notSaid')} className="text-ink-muted" />
            )}
          </Row>
        )}
        {confirmation.note && <Row label="comments">{confirmation.note}</Row>}
      </dl>
      <div className="mt-5 flex flex-col gap-3">
        <Button block onClick={onBack}>
          <Bi text={t('back')} className="text-center leading-tight" mlClassName="mt-0.5 font-medium text-teak/75" />
        </Button>
        <Link
          to={`/boat/${encodeURIComponent(entry.boatId)}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-current/35 px-5 py-2.5 font-semibold text-ink transition-[scale,border-color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:border-current/70 active:scale-[0.96]"
        >
          <Bi text={t('seeRecord')} className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-75" />
          <Icon.Arrow size={18} className="shrink-0" />
        </Link>
      </div>
    </Card>
  );
}

/** The entry already has an answer, from this operator or another. */
export function AlreadyDecided({ entry }: { entry: Entry }) {
  const c = entry.confirmation!;
  const received = c.decision === 'received';
  const body = fill(t(received ? 'alreadyConfirmedBody' : 'alreadyDisputedBody'), { name: c.operatorName });
  return (
    <div role="status" className={`surface-light mt-4 rounded-card p-5 ${received ? 'bg-confirmed-soft text-confirmed' : 'bg-declared-soft text-declared'}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{received ? <Icon.Check size={22} /> : <Icon.Cross size={22} />}</span>
        <div className="min-w-0">
          <Bi as="h3" text={t(received ? 'alreadyConfirmed' : 'alreadyDisputed')} className="font-semibold" mlClassName="mt-0.5" />
          <Bi as="p" text={body} className="mt-1 text-small text-ink" />
          <p className="mt-1 text-small tabular-nums text-ink-muted">
            {dayTime(c.at)}
            {c.quantity ? ` · ${c.quantity}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

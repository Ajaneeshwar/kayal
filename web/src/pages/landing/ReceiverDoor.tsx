import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { MethodIcon } from '../../components/MethodIcon.tsx';
import { Select } from '../../components/Select.tsx';
import { t, type StringKey } from '../../i18n/index.ts';
import { usePick } from '../../i18n/language.ts';
import { goTo } from '../../lib/api.ts';
import { usePageRestore } from '../../lib/usePageRestore.ts';
import { ApiError, getDirectory, getPending, saveSession, type Directory } from '../operator/api.ts';
import { t as operatorText } from '../operator/i18n.ts';
import { operatorDetail } from '../operator/SignIn.tsx';
import { TYPE, TYPE_ORDER } from '../operator/ui.tsx';

/** The operator page's own "last receiver" key (operator/SignIn.tsx), so both pickers agree. */
const LAST_KEY = 'kayal.operatorLast';
/** Never leave the button spinning if the server cannot be reached. */
const TIMEOUT_MS = 15_000;

type Problem = 'empty' | 'wrong' | 'gone' | 'offline' | 'slow';

const PROBLEM: Record<Problem, StringKey> = {
  empty: 'receiverCodeEmpty',
  wrong: 'receiverCodeWrong',
  gone: 'receiverGone',
  offline: 'receiverOffline',
  slow: 'receiverSlow',
};

function lastReceiver() {
  try {
    return localStorage.getItem(LAST_KEY) ?? '';
  } catch {
    return '';
  }
}

/* The same header as the doors in Doors.tsx, which keeps its own copy private. */
function DoorHeader({ icon, title, body }: { icon: ReactNode; title: StringKey; body: StringKey }) {
  return (
    <div className="flex flex-col items-start gap-4 min-[400px]:flex-row">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teak text-gold shadow-[inset_0_0_0_1.5px_var(--color-gold-edge)]">
        {icon}
      </span>
      <div className="min-w-0">
        <Bi k={title} as="h3" className="font-display text-heading font-semibold text-ink" mlClassName="mt-0.5 text-ink-muted" />
        <Bi k={body} as="p" className="mt-2 text-small text-ink-muted" mlClassName="mt-1" />
      </div>
    </div>
  );
}

/**
 * The fourth door: a plant desk, suction truck, pump boat or waste collector signs in here. It
 * checks the code exactly as /operator does, stores the same session, then opens /operator.
 */
export function ReceiverDoor({ className = '' }: { className?: string }) {
  const pick = usePick();
  const id = useId();
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [listAttempt, setListAttempt] = useState(0);
  const [chosen, setChosen] = useState(lastReceiver);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  // Back from /operator restores this page mid sign-in: stop the spinner and clear the code.
  usePageRestore(() => {
    setBusy(false);
    setCode('');
    setProblem(null);
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    setListFailed(false);
    getDirectory(controller.signal)
      .then(
        (d) => active && setDirectory(d),
        () => active && setListFailed(true),
      )
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [listAttempt]);

  // Grouped by type in the operator page's order: plants, trucks, pump boats, collectors.
  const receivers = useMemo(() => {
    const list = directory?.operators ?? [];
    return TYPE_ORDER.flatMap((type) => list.filter((o) => o.type === type));
  }, [directory]);
  const selected = receivers.find((o) => o.id === chosen) ?? receivers[0];
  const codeProblem = problem === 'empty' || problem === 'wrong';
  const none = Boolean(directory) && !receivers.length;

  useEffect(() => {
    if (codeProblem) codeRef.current?.select();
  }, [codeProblem, attempt]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !selected) return;
    const fail = (p: Problem) => {
      setProblem(p);
      setAttempt((n) => n + 1);
    };
    if (!code.trim()) {
      codeRef.current?.focus();
      return fail('empty');
    }
    setBusy(true);
    setProblem(null);
    const session = { id: selected.id, code: code.trim() };
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    try {
      // The check /operator makes: the pending list answers 401 for a wrong code.
      await getPending(session, timeout);
    } catch (err) {
      setBusy(false);
      const status = err instanceof ApiError ? err.status : 0;
      // 404: this receiver was removed since the list loaded, so reload the list.
      if (status === 404) setListAttempt((n) => n + 1);
      return fail(status === 401 ? 'wrong' : status === 404 ? 'gone' : timeout.aborted ? 'slow' : 'offline');
    }
    saveSession(session);
    try {
      localStorage.setItem(LAST_KEY, selected.id);
    } catch {
      // Not important enough to report.
    }
    goTo('/operator');
  }

  const options = receivers.length
    ? receivers.map((op) => ({
        value: op.id,
        label: op.name,
        secondary: [pick(operatorText(TYPE[op.type].one)), operatorDetail(op, directory)].filter(Boolean).join(' · '),
      }))
    : [{ value: '', label: pick(t('receiversLoading')) }];

  return (
    <Card
      as="article"
      id="door-receiver"
      className={`flex h-full scroll-mt-6 flex-col p-6 sm:p-7 [&>div]:flex [&>div]:flex-1 [&>div]:flex-col ${className}`}
      aria-labelledby={`${id}-t`}
    >
      <div id={`${id}-t`}>
        <DoorHeader icon={<MethodIcon method="collection_point" size={24} />} title="receiverTitle" body="receiverBody" />
      </div>
      <form onSubmit={submit} noValidate className="mt-auto pt-6">
        <label htmlFor={`${id}-pick`} className="block text-small font-semibold text-ink">
          <Bi k="receiverPick" layout="inline" mlClassName="text-ink-muted" />
        </label>
        {listFailed && !directory ? (
          <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-control bg-overdue-soft px-4 py-3 text-small text-overdue">
            <Bi k="receiversLoadFail" className="min-w-0 flex-1" />
            <button type="button" onClick={() => setListAttempt((n) => n + 1)} className="min-h-11 rounded-control px-3 font-semibold underline underline-offset-4">
              <Bi k="receiversRetry" />
            </button>
          </div>
        ) : none ? (
          <Bi as="p" k="receiversNone" className="mt-2 rounded-control border border-line px-4 py-3 text-small text-ink-muted" mlClassName="mt-1" />
        ) : (
          <Select
            id={`${id}-pick`}
            name="receiver"
            value={selected?.id ?? ''}
            onChange={(value) => {
              setChosen(value);
              if (problem === 'gone') setProblem(null);
            }}
            disabled={!receivers.length}
            className="mt-2 text-body font-medium"
            options={options}
          />
        )}
        <div id={`${id}-pick-msg`} role="alert" className="text-small text-overdue">
          {problem === 'gone' && <Bi k="receiverGone" as="p" className="mt-2" mlClassName="mt-0.5" />}
        </div>

        <label htmlFor={`${id}-code`} className="mt-4 block text-small font-semibold text-ink">
          <Bi k="receiverCode" layout="inline" mlClassName="text-ink-muted" />
        </label>
        <motion.div
          key={attempt}
          animate={attempt && codeProblem ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.36, ease: 'easeOut' }}
        >
          <input
            ref={codeRef}
            id={`${id}-code`}
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={64}
            disabled={none}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (problem && problem !== 'gone') setProblem(null);
            }}
            aria-invalid={codeProblem || undefined}
            aria-describedby={`${id}-msg`}
            className={`mt-2 h-12 w-full rounded-control border bg-kasavu px-4 text-body tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-ink-muted/70 disabled:cursor-not-allowed disabled:opacity-60 ${
              codeProblem ? 'border-overdue' : 'border-field-border'
            }`}
            placeholder="••••"
          />
        </motion.div>
        <div id={`${id}-msg`} role="alert" className="min-h-0 text-small text-overdue">
          {problem && problem !== 'gone' && <Bi k={PROBLEM[problem]} as="p" className="mt-2" mlClassName="mt-0.5" />}
        </div>

        <Button type="submit" variant="secondary" block busy={busy} disabled={!selected} className="mt-4">
          <Bi k="signIn" className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-70" />
        </Button>
      </form>
    </Card>
  );
}

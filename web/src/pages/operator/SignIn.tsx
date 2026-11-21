import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { ApiError, getPending, saveSession, type Directory, type Entry, type Operator, type Session } from './api.ts';
import { t, type Pair } from './i18n.ts';
import { Shell } from './Shell.tsx';
import type { OperatorKey } from './strings.ts';
import { Banner, Icon, INPUT, TYPE, TYPE_ORDER, TypeMark } from './ui.tsx';

const LAST_KEY = 'kayal.operatorLast';

function lastOperator() {
  try {
    return localStorage.getItem(LAST_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The vehicle number or plant name under an operator's name. */
export function operatorDetail(op: Operator, directory: Directory | null) {
  if (op.vehicleNumber) return op.vehicleNumber;
  if (op.facilityId) return directory?.facilities.get(op.facilityId)?.name ?? null;
  return null;
}

type Problem = Extract<OperatorKey, 'codeWrong' | 'codeEmpty' | 'pickFirst' | 'loadFail'>;

export function SignIn({
  directory,
  directoryFailed,
  retryDirectory,
  scanned,
  expired,
  onSignedIn,
}: {
  directory: Directory | null;
  directoryFailed: boolean;
  retryDirectory: () => void;
  /** Opened from a crew's QR link. */
  scanned: boolean;
  /** The stored code stopped working. */
  expired: boolean;
  onSignedIn: (session: Session, operator: Operator, pending: Entry[]) => void;
}) {
  const operators = directory?.operators ?? [];
  const [chosen, setChosen] = useState(lastOperator);
  const selected = operators.find((o) => o.id === chosen) ?? (operators.length === 1 ? operators[0] : undefined);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const groups = useMemo(
    () => TYPE_ORDER.map((type) => ({ type, list: operators.filter((o) => o.type === type) })).filter((g) => g.list.length),
    [operators],
  );

  useEffect(() => {
    if (problem === 'codeWrong' || problem === 'codeEmpty') codeRef.current?.select();
  }, [problem, attempt]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fail = (p: Problem) => {
      setProblem(p);
      setAttempt((n) => n + 1);
    };
    if (!selected) return fail('pickFirst');
    if (!code.trim()) {
      codeRef.current?.focus();
      return fail('codeEmpty');
    }
    setBusy(true);
    const session = { id: selected.id, code: code.trim() };
    try {
      const { operator, pending } = await getPending(session);
      saveSession(session);
      try {
        localStorage.setItem(LAST_KEY, selected.id);
      } catch {
        // Not important enough to report.
      }
      onSignedIn(session, operator ?? selected, pending);
    } catch (err) {
      setBusy(false);
      const status = err instanceof ApiError ? err.status : 0;
      // 404: this operator was removed since the list loaded, so reload the list.
      if (status === 404) retryDirectory();
      fail(status === 401 ? 'codeWrong' : status === 404 ? 'pickFirst' : 'loadFail');
    }
  }

  const codeProblem = problem === 'codeWrong' || problem === 'codeEmpty';

  return (
    <Shell>
      <h1 className="font-display text-title font-semibold">
        <Bi text={t('signInTitle')} mlClassName="mt-1 text-heading! text-gold-bright" />
      </h1>
      <Bi as="p" text={t('signInBody')} className="mt-3 text-body text-ink-inverse-muted" mlClassName="mt-1 text-small" />

      <div className="mt-5 flex flex-col gap-2">
        {expired && <Banner text={t('signedOut')} />}
        {scanned && !expired && <Banner text={t('scannedNote')} />}
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <form onSubmit={submit} noValidate>
          <fieldset aria-describedby={`${id}-pick`}>
            <legend className="font-display text-heading font-semibold text-ink">
              <Bi text={t('whoAreYou')} mlClassName="mt-0.5 text-body! text-ink-muted" />
            </legend>

            {!directory && !directoryFailed && (
              <div aria-busy="true" className="mt-4 flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} aria-hidden="true" className="h-14 rounded-control border border-line" />
                ))}
              </div>
            )}
            {directoryFailed && !directory && (
              <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-overdue-soft px-4 py-3 text-small text-overdue">
                <Bi text={t('loadFail')} className="min-w-0 flex-1" />
                <button type="button" onClick={retryDirectory} className="min-h-11 rounded-control px-3 font-semibold underline underline-offset-4">
                  <Bi text={t('tryAgain')} />
                </button>
              </div>
            )}
            {directory && !operators.length && <Bi as="p" text={t('noOperators')} className="mt-4 text-small text-ink-muted" />}

            <div className="mt-4 flex flex-col gap-5">
              {groups.map(({ type, list }) => (
                <div key={type} role="group" aria-labelledby={`${id}-${type}`}>
                  <div className="flex items-center gap-2.5">
                    <TypeMark type={type} size="sm" />
                    <Bi id={`${id}-${type}`} text={t(TYPE[type].group)} className="text-small font-semibold text-gold-ink" mlClassName="font-normal" />
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {list.map((op) => (
                      <OperatorOption
                        key={op.id}
                        op={op}
                        name={`${id}-op`}
                        detail={operatorDetail(op, directory)}
                        checked={selected?.id === op.id}
                        onChange={() => {
                          setChosen(op.id);
                          if (problem === 'pickFirst') setProblem(null);
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div id={`${id}-pick`} role="alert" className="text-small text-overdue">
              {problem === 'pickFirst' && <Bi as="p" text={t('pickFirst')} className="mt-2" />}
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={`${id}-code`} className="block text-small font-semibold text-ink">
              <Bi text={t('codeLabel')} layout="inline" mlClassName="text-ink-muted" />
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
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (problem && problem !== 'pickFirst') setProblem(null);
                }}
                aria-invalid={codeProblem || undefined}
                aria-describedby={`${id}-code-msg`}
                className={`mt-2 ${INPUT} tracking-[0.2em]`}
              />
            </motion.div>
            <div id={`${id}-code-msg`} role="alert" className="text-small text-overdue">
              {problem && problem !== 'pickFirst' && <Bi as="p" text={t(problem)} className="mt-2" />}
            </div>
          </div>

          <Button type="submit" block busy={busy} disabled={!operators.length} className="mt-5">
            <Bi text={t('continue')} className="text-start leading-tight" mlClassName="mt-0.5 font-medium text-teak/75" />
            <Icon.Arrow size={20} className="shrink-0" />
          </Button>
          <Bi as="p" text={t('demoNote')} className="mt-3 text-caption text-ink-muted" />
        </form>
      </Card>
    </Shell>
  );
}

function OperatorOption({
  op,
  name,
  detail,
  checked,
  onChange,
}: {
  op: Operator;
  name: string;
  detail: string | null;
  checked: boolean;
  onChange: () => void;
}) {
  const typeLabel: Pair = t(TYPE[op.type].one);
  return (
    <li>
      <label
        className="group relative flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-line bg-kasavu px-4 py-2.5 transition-[border-color,background-color,scale] duration-[var(--duration-press)] ease-[var(--ease-out)]
          active:scale-[0.98] has-checked:border-gold-ink has-checked:bg-surface has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
      >
        <input type="radio" name={name} value={op.id} checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{op.name}</span>
          <span className="block text-caption tabular-nums text-ink-muted [overflow-wrap:anywhere]">
            {detail ?? <Bi text={typeLabel} layout="inline" />}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-field-border text-kasavu transition-[background-color,border-color] duration-150 peer-checked:border-gold-ink peer-checked:bg-gold-ink"
        >
          <Icon.Check size={14} strokeWidth={3} className={checked ? '' : 'opacity-0'} />
        </span>
      </label>
    </li>
  );
}

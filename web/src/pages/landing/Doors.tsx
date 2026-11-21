import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Select } from '../../components/Select.tsx';
import { usePick } from '../../i18n/language.ts';
import { goTo, lastCrewBoat, rememberCrewBoat, saveAdminPin, signInInspector, type Boat } from '../../lib/api.ts';
import type { BoatsState } from '../../lib/useBoats.ts';
import type { StringKey } from '../../i18n/index.ts';
import { t } from '../../i18n/index.ts';
import { filterBoats } from '../../lib/boatTools.ts';
import { ArrowIcon, EyeIcon, OarIcon, ShieldIcon } from './icons.tsx';

export type BoatsProps = BoatsState & { retry: () => void };

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

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-overdue-soft px-4 py-3 text-small text-overdue">
      <span>Could not load the boats.</span>
      <button type="button" onClick={retry} className="min-h-11 rounded-control px-3 font-semibold underline underline-offset-4">
        Try again
      </button>
    </div>
  );
}

export function CrewDoor({ status, boats, retry }: BoatsProps) {
  const pick = usePick();
  const [chosen, setChosen] = useState(lastCrewBoat);
  const selected: Boat | undefined = boats.find((b) => b.id === chosen) ?? boats[0];
  const selectId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    rememberCrewBoat(selected.id);
    goTo(`/crew?boat=${encodeURIComponent(selected.id)}`);
  }

  return (
    <Card as="article" id="door-crew" className="flex h-full flex-col p-6 sm:p-7 [&>div]:flex [&>div]:flex-1 [&>div]:flex-col" aria-labelledby={`${selectId}-t`}>
      <div id={`${selectId}-t`}>
        <DoorHeader icon={<OarIcon className="size-6" />} title="crewTitle" body="crewBody" />
      </div>
      <form onSubmit={submit} className="mt-auto pt-6">
        <label htmlFor={selectId} className="block text-small font-semibold text-ink">
          <Bi k="yourBoat" layout="inline" mlClassName="text-ink-muted" />
        </label>
        {status === 'error' && !boats.length ? (
          <div className="mt-2">
            <LoadError retry={retry} />
          </div>
        ) : (
          <Select
            id={selectId}
            name="boat"
            value={selected?.id ?? ''}
            onChange={setChosen}
            disabled={!boats.length}
            className="mt-2 text-body font-medium"
            options={boats.length ? boats.map((b) => ({ value: b.id, label: b.name, secondary: b.registration, lang: 'en' })) : [{ value: '', label: pick(t('loadingBoats')) }]}
          />
        )}
        <Button type="submit" block className="mt-4 justify-between py-2.5" disabled={!selected}>
          <Bi k="openCrew" className="text-start leading-tight" mlClassName="mt-0.5 font-medium text-teak/75" />
          <ArrowIcon className="size-5 shrink-0" />
        </Button>
      </form>
    </Card>
  );
}

export function InspectorDoor() {
  const [pin, setPin] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'empty' | 'wrong' | 'error'>('idle');
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const failed = state === 'wrong' || state === 'error' || state === 'empty';

  useEffect(() => {
    if (failed) inputRef.current?.select();
  }, [failed, attempt]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    if (!pin.trim()) {
      setState('empty');
      setAttempt((n) => n + 1);
      inputRef.current?.focus();
      return;
    }
    setState('busy');
    const result = await signInInspector(pin);
    if (result === 'ok') {
      saveAdminPin(pin);
      goTo('/dashboard');
      return;
    }
    setState(result);
    setAttempt((n) => n + 1);
  }

  return (
    <Card as="article" id="door-inspector" className="flex h-full flex-col p-6 sm:p-7 [&>div]:flex [&>div]:flex-1 [&>div]:flex-col" aria-labelledby={`${id}-t`}>
      <div id={`${id}-t`}>
        <DoorHeader icon={<ShieldIcon className="size-6" />} title="inspectorTitle" body="inspectorBody" />
      </div>
      <form onSubmit={submit} noValidate className="mt-auto pt-6">
        <label htmlFor={id} className="block text-small font-semibold text-ink">
          <Bi k="pinLabel" layout="inline" mlClassName="text-ink-muted" />
        </label>
        <motion.div
          key={attempt}
          animate={attempt && failed ? { x: [0, -7, 6, -4, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.36, ease: 'easeOut' }}
        >
          <input
            ref={inputRef}
            id={id}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="go"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (failed) setState('idle');
            }}
            aria-invalid={failed || undefined}
            aria-describedby={`${id}-msg`}
            maxLength={64}
            className={`mt-2 h-12 w-full rounded-control border bg-kasavu px-4 text-body tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-ink-muted/70 ${
              failed ? 'border-overdue' : 'border-field-border'
            }`}
            placeholder="••••"
          />
        </motion.div>
        <div id={`${id}-msg`} role="alert" className="min-h-0 text-small text-overdue">
          {state === 'wrong' && <Bi k="pinWrong" as="p" className="mt-2" mlClassName="mt-0.5" />}
          {state === 'empty' && <p className="mt-2">Enter the PIN first.</p>}
          {state === 'error' && <p className="mt-2">Could not reach Kayal Log. Check the connection and try again.</p>}
        </div>
        <Button type="submit" variant="secondary" block busy={state === 'busy'} className="mt-4">
          <Bi k="signIn" className="text-center leading-tight" mlClassName="mt-0.5 font-medium opacity-70" />
        </Button>
      </form>
    </Card>
  );
}

export function GuestDoor({ status, boats, retry }: BoatsProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const matching = filterBoats(boats, query);
  const count = t('boatMatches');
  return (
    <Card as="article" id="door-guest" className="flex h-full flex-col p-6 sm:p-7" aria-labelledby={`${id}-t`}>
      <div id={`${id}-t`}>
        <DoorHeader icon={<EyeIcon className="size-6" />} title="guestTitle" body="guestBody" />
      </div>
      <div className="mt-auto pt-6">
        <label htmlFor={`${id}-search`} className="block text-small font-semibold text-ink"><Bi k="boatSearch" /></label>
        <input id={`${id}-search`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="mt-2 min-h-12 w-full rounded-control border border-field-border bg-kasavu px-3 text-ink" />
        <p role="status" aria-live="polite" className="my-3 text-small text-ink-muted">
          {status === 'ready' && <Bi text={{ en: count.en.replace('{count}', String(matching.length)), ml: count.ml.replace('{count}', String(matching.length)) }} />}
        </p>
        {status === 'error' && !boats.length ? (
          <LoadError retry={retry} />
        ) : (
          <ul
            aria-label="Boats"
            aria-busy={status === 'loading' || undefined}
            /* In the sign-in sheet's 2×2 grid the list scrolls, so the guest door stays near the height of
               the inspector door beside it. The next row peeks out to show there is more. */
            className="grid gap-2 md:grid-cols-2 lg:max-h-[15.5rem] lg:grid-cols-1 lg:overflow-y-auto lg:overscroll-contain"
          >
            {status === 'loading' && !boats.length &&
              [0, 1, 2, 3].map((i) => (
                <li key={i} className="flex h-14 items-center gap-3 rounded-control border border-line px-4" aria-hidden>
                  <span className="h-3 w-28 rounded-pill bg-line" />
                  <span className="ms-auto h-5 w-16 rounded-pill bg-line" />
                </li>
              ))}
            {status === 'ready' && !matching.length && <li className="col-span-full py-4"><Bi k="noBoatMatches" /></li>}
            {matching.map((b) => (
              <li key={b.id} className="min-w-0 rounded-control border border-line">
                <a
                  href={`/boat/${encodeURIComponent(b.id)}`}
                  className="group flex min-h-14 items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-surface focus-visible:-outline-offset-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug text-ink">{b.name}</span>
                    <span className="block break-words text-caption tabular-nums text-ink-muted">{b.registration}</span>
                  </span>
                  <StatusBadge state={b.status.state} bilingual={false} />
                  <ArrowIcon className="hidden size-4 shrink-0 text-ink-muted transition-transform min-[400px]:block duration-150 group-hover:translate-x-0.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

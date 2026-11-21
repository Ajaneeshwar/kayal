import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { goTo, lastCrewBoat, rememberCrewBoat, saveAdminPin, signInInspector, type Boat } from '../../lib/api.ts';
import { useBoats, type BoatsState } from '../../lib/useBoats.ts';
import type { StringKey } from '../../i18n/index.ts';
import { ArrowIcon, ChevronDownIcon, EyeIcon, OarIcon, ShieldIcon } from './icons.tsx';

type BoatsProps = BoatsState & { retry: () => void };

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

function CrewDoor({ status, boats, retry }: BoatsProps) {
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
    <Card as="article" className="flex h-full flex-col p-6 sm:p-7" aria-labelledby={`${selectId}-t`}>
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
          <div className="relative mt-2">
            <select
              id={selectId}
              value={selected?.id ?? ''}
              onChange={(e) => setChosen(e.target.value)}
              disabled={!boats.length}
              className="h-12 w-full min-w-0 truncate appearance-none rounded-control border border-field-border bg-kasavu ps-4 pe-11 text-body font-medium text-ink disabled:text-ink-muted"
            >
              {!boats.length && <option value="">Loading boats…</option>}
              {boats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute end-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
          </div>
        )}
        <Button type="submit" block className="mt-4 justify-between py-2.5" disabled={!selected}>
          <Bi k="openCrew" className="text-start leading-tight" mlClassName="mt-0.5 font-medium text-teak/75" />
          <ArrowIcon className="size-5 shrink-0" />
        </Button>
      </form>
    </Card>
  );
}

function InspectorDoor() {
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
    <Card as="article" className="flex h-full flex-col p-6 sm:p-7" aria-labelledby={`${id}-t`}>
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

function GuestDoor({ status, boats, retry }: BoatsProps) {
  const id = useId();
  return (
    <Card as="article" className="flex h-full flex-col p-6 sm:p-7 lg:col-span-2" aria-labelledby={`${id}-t`}>
      <div id={`${id}-t`}>
        <DoorHeader icon={<EyeIcon className="size-6" />} title="guestTitle" body="guestBody" />
      </div>
      <div className="mt-auto pt-6">
        {status === 'error' && !boats.length ? (
          <LoadError retry={retry} />
        ) : (
          <ul
            aria-label="Boats"
            aria-busy={status === 'loading' || undefined}
            className="grid gap-2 md:grid-cols-2 lg:grid-cols-3"
          >
            {!boats.length &&
              [0, 1, 2, 3].map((i) => (
                <li key={i} className="flex h-14 items-center gap-3 rounded-control border border-line px-4" aria-hidden>
                  <span className="h-3 w-28 rounded-pill bg-line" />
                  <span className="ms-auto h-5 w-16 rounded-pill bg-line" />
                </li>
              ))}
            {boats.map((b) => (
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

export function Doors() {
  const boats = useBoats();
  return (
    <section id="doors" aria-labelledby="doors-title" className="surface-light scroll-mt-4 bg-surface">
      {/* Kasavu border: a gold band with a fine second line, like the edge of a Kerala sari. */}
      <div aria-hidden className="h-[3px] bg-gold-edge" />
      <div aria-hidden className="mt-[3px] h-px bg-gold-edge/60" />
      <div className="mx-auto max-w-[76rem] px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-2xl">
          <Bi k="signinTitle" as="h2" id="doors-title" className="font-display text-title font-semibold text-ink" mlClassName="mt-1 text-gold-ink" />
          <p className="mt-3 text-body text-ink-muted">Demo sign-ins for HackaThoni, not real accounts.</p>
        </div>
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <CrewDoor {...boats} />
          <InspectorDoor />
          <GuestDoor {...boats} />
        </div>
      </div>
    </section>
  );
}

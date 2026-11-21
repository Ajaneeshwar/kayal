import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { AppShell } from '../../components/AppShell.tsx';
import { LanguagePage } from '../../components/LanguagePage.tsx';
import { useLang, useLangChosen, usePick } from '../../i18n/language.ts';
import { t } from '../../i18n/index.ts';
import { Bi } from '../../components/Bi.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { useFontsReady } from '../../lib/useFontsReady.ts';
import { useBoats } from '../../lib/useBoats.ts';
import { Seal } from '../boat/Seal.tsx';
import type { StringKey } from '../../i18n/index.ts';
import { HouseboatScene } from './HouseboatScene.tsx';
import { SignInSheet, signinFromHash, type DoorKey } from './SignInSheet.tsx';
import { LandingFooter } from './LandingFooter.tsx';
import { Partners } from './Partners.tsx';
import { ArrowIcon } from './icons.tsx';
import { en } from './strings.ts';

const EASE = [0.23, 1, 0.32, 1] as const;

const heroGroup: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const heroItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

function Hero({ ready, onSignin }: { ready: boolean; onSignin: (from: HTMLElement) => void }) {
  const pick = usePick();
  const { boats, status } = useBoats();
  const boat = status === 'ready'
    ? boats.filter((b) => b.lastEntryAt).sort((a, b) => Date.parse(b.lastEntryAt!) - Date.parse(a.lastEntryAt!))[0]
    : undefined;
  const loggedDays = boat?.lastEntryAt ? Math.max(0, Math.floor((Date.now() - Date.parse(boat.lastEntryAt)) / 86_400_000)) : 0;
  const logged = t(loggedDays === 1 ? 'loggedDayAgo' : 'loggedDaysAgo');
  return (
    <section aria-labelledby="hero-title" className="relative isolate min-h-[49rem] overflow-hidden pb-64 lg:min-h-[44rem] lg:pb-12">
      <HouseboatScene className="absolute inset-x-0 bottom-0 -z-10 h-[22rem] w-full [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_75%,transparent)] lg:h-full lg:[mask-image:linear-gradient(to_bottom,black_80%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-teak-deep/75 via-teak-deep/75 to-transparent lg:bg-gradient-to-r lg:from-teak-deep/75 lg:via-teak-deep/60 lg:via-35% lg:to-transparent lg:to-60%" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-teak" />
      <motion.div
        initial="hidden"
        animate={ready ? 'show' : 'hidden'}
        variants={heroGroup}
        className="mx-auto max-w-[76rem] px-5 pt-20 sm:px-6 lg:px-8 lg:pt-24"
      >
        <motion.p variants={heroItem} className="text-caption font-semibold text-gold">
          Kayal Log · Alappuzha backwaters<span className="hidden sm:inline"> · Vembanad lake</span>
        </motion.p>
        <motion.div variants={heroItem}>
          <Bi
            k="tagline"
            as="h1"
            id="hero-title"
            className="mt-3 max-w-[16ch] font-display text-[clamp(2.5rem,5vw,4.75rem)] font-semibold leading-[1.05] text-ink-inverse"
            mlClassName="mt-3 !text-[0.5em] leading-snug text-gold-bright"
          />
        </motion.div>
        <motion.div variants={heroItem} className="mt-7">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={(e) => onSignin(e.currentTarget)}
            className="group inline-flex min-h-12 items-center gap-2 rounded-pill bg-gold px-5 text-start font-semibold text-teak shadow-[var(--shadow-button)] transition-[background-color,transform] duration-150 [text-shadow:none] hover:bg-gold-bright active:scale-[0.97]"
          >
            {pick(t('signinTitle'))}
            <ArrowIcon className="size-5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </motion.div>
        {boat && (
          <motion.div variants={heroItem} className="mt-5 w-full min-w-0 max-w-[calc(100vw-3.5rem)] sm:max-w-sm [text-shadow:none]">
            <Bi k="guestBody" as="p" className="mb-2 text-small text-ink-inverse" mlClassName="mt-1" />
            <a
              href={`/boat/${encodeURIComponent(boat.id)}`}
              className="surface-light group flex w-full min-w-0 items-center gap-3 rounded-card border border-gold-edge bg-kasavu p-3 text-ink shadow-raised"
            >
              <Seal state={boat.status.state} className="size-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{boat.name}</span>
                <span className="mb-1 block break-words text-caption text-ink-muted">{boat.registration}</span>
                <Bi text={{ en: logged.en.replace('{days}', String(loggedDays)), ml: logged.ml.replace('{days}', String(loggedDays)) }} className="mb-1 block text-caption text-ink-muted" />
                <StatusBadge state={boat.status.state} bilingual={false} />
              </span>
              <ArrowIcon className="size-5 shrink-0 text-gold-ink transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

const STEPS: { n: string; title: StringKey; body: StringKey }[] = [
  { n: '1', title: 'sayTitle', body: 'sayBody' },
  { n: '2', title: 'proveTitle', body: 'proveBody' },
  { n: '3', title: 'showTitle', body: 'showBody' },
];

function Steps() {
  return (
    <section aria-labelledby="how-title" className="relative mx-auto max-w-[76rem] px-4 pb-20 pt-2 sm:px-6 lg:px-8 lg:pb-24">
      <Bi
        k="howTitle"
        as="h2"
        id="how-title"
        className="font-display text-title font-semibold text-ink-inverse"
        mlClassName="mt-1 text-gold"
      />
      <ol className="mt-8 grid md:grid-cols-3">
        {STEPS.map(({ n, title, body }, i) => (
          <motion.li
            key={n}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
            className="flex flex-col border-t border-white/10 py-6 first:border-t-0 first:pt-0 md:border-s md:border-t-0 md:px-7 md:py-0 md:first:border-s-0 md:first:ps-0 md:last:pe-0"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-display text-heading font-semibold tabular-nums text-gold">{n}</span>
              <Bi k={title} as="h3" className="font-display text-heading font-semibold text-ink-inverse" mlClassName="mt-0.5 text-gold" />
            </div>
            <Bi k={body} as="p" className="mt-3 text-body text-ink-inverse-muted" mlClassName="mt-2" />
            {n === '3' && (
              <ul role="list" className="mt-5">
                {(['verified', 'declared', 'overdue'] as const).map((state) => (
                  <li key={state} className="flex items-center gap-3 border-t border-ink-inverse/15 py-3 first:border-t-0 first:pt-0 last:pb-0">
                    <Seal state={state} stamp={false} className="size-10 shrink-0" />
                    <div className="min-w-0">
                      <Bi k={state} className="text-small font-semibold text-ink-inverse" />
                      <Bi text={{ en: en[`${state}Meaning`], ml: '' }} className="mt-0.5 text-caption text-ink-inverse-muted" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

/** The small Sign in button at the end of the landing header, beside the language switch. */
function SignInButton({ open, onClick, ref }: { open: boolean; onClick: () => void; ref: Ref<HTMLButtonElement> }) {
  const lang = useLang();
  // "സൈൻ ഇൻ ചെയ്യുക" is about 2.5 times as wide as "Sign in". Below 400 px it wraps onto two lines,
  // so the logo, this button and the language switch still fit a 360 px phone.
  const wrap = lang === 'both' ? 'max-[400px]:max-w-[4.25rem]' : lang === 'ml' ? 'max-[400px]:max-w-[5.5rem]' : '';
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      className="inline-flex min-h-11 shrink-0 items-center rounded-pill border border-gold-edge px-3 text-small font-semibold text-gold-bright transition-[background-color,transform] duration-150 hover:bg-gold/15 active:scale-[0.96]"
    >
      <Bi k="signIn" className={`flex flex-col items-start py-1 text-start ${wrap}`} enClassName="leading-[1.25] [overflow-wrap:normal]" mlClassName="text-[0.6875rem] font-medium leading-[1.2]" />
    </button>
  );
}

const NARROW = '(max-width: 399.98px)';
function subscribeNarrow(fn: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', fn);
  return () => query.removeEventListener('change', fn);
}

export default function LandingPage() {
  const ready = useFontsReady();
  const chosen = useLangChosen();
  const lang = useLang();
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  // The open sign-in sheet and the door it opened at, or null when it is closed.
  const [signin, setSignin] = useState<{ door?: DoorKey } | null>(null);
  const signinButton = useRef<HTMLButtonElement>(null);
  // Where focus goes back to on close: the control that opened the sheet, else the Sign in button.
  const returnTo = useRef<HTMLElement | null>(null);

  const openSignin = useCallback((door?: DoorKey, from?: HTMLElement | null) => {
    returnTo.current = from ?? null;
    setSignin({ door });
  }, []);

  const closeSignin = useCallback(() => {
    setSignin(null);
    if (signinFromHash(window.location.hash)) {
      history.replaceState(history.state, '', window.location.pathname + window.location.search);
    }
  }, []);

  // `/#signin` and `/#signin-crew` (and the other doors) open the sheet, on load and from links.
  useEffect(() => {
    if (!chosen) return;
    function fromHash() {
      const asked = signinFromHash(window.location.hash);
      if (asked) {
        const active = document.activeElement;
        openSignin(asked.door, active instanceof HTMLElement && active !== document.body ? active : null);
      } else {
        setSignin(null);
      }
    }
    if (signinFromHash(window.location.hash)) fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [chosen, openSignin]);

  // While the sheet is open the page behind it is inert and does not scroll.
  const isOpen = signin !== null;
  useEffect(() => {
    if (!isOpen) return;
    const root = document.getElementById('root');
    const html = document.documentElement;
    const scrollbar = window.innerWidth - html.clientWidth;
    root?.setAttribute('inert', '');
    html.style.overflow = 'hidden';
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    return () => {
      root?.removeAttribute('inert');
      html.style.overflow = '';
      html.style.paddingRight = '';
      const back = returnTo.current?.isConnected ? returnTo.current : signinButton.current;
      back?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!chosen) return <LanguagePage backdrop={<HouseboatScene className="size-full" />} />;
  return (
    <AppShell
      footer={<LandingFooter />}
      // In Malayalam a 360 px header has no room for the switch's language name as well.
      compactLanguage={narrow && lang === 'ml'}
      headerEnd={<SignInButton ref={signinButton} open={isOpen} onClick={() => openSignin(undefined, signinButton.current)} />}>
      <Hero ready={ready} onSignin={(from) => openSignin(undefined, from)} />
      <Steps />
      <Partners />
      <AnimatePresence>{signin && <SignInSheet key="signin" door={signin.door} onClose={closeSignin} />}</AnimatePresence>
    </AppShell>
  );
}

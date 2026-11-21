import { motion, type Variants } from 'motion/react';
import { AppShell } from '../../components/AppShell.tsx';
import { LanguagePage } from '../../components/LanguagePage.tsx';
import { useLangChosen, usePick } from '../../i18n/language.ts';
import { t } from '../../i18n/index.ts';
import { Bi } from '../../components/Bi.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { useFontsReady } from '../../lib/useFontsReady.ts';
import { useBoats } from '../../lib/useBoats.ts';
import { Seal } from '../boat/Seal.tsx';
import type { StringKey } from '../../i18n/index.ts';
import { HouseboatScene } from './HouseboatScene.tsx';
import { Doors } from './Doors.tsx';
import { ArrowIcon } from './icons.tsx';

const EASE = [0.23, 1, 0.32, 1] as const;

const heroGroup: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const heroItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

function Hero({ ready }: { ready: boolean }) {
  const pick = usePick();
  const { boats, status } = useBoats();
  const boat = status === 'ready' ? boats[0] : undefined;
  return (
    <section aria-labelledby="hero-title" className="relative isolate min-h-[49rem] overflow-hidden pb-64 lg:min-h-[44rem] lg:pb-12">
      <HouseboatScene className="absolute inset-x-0 bottom-0 -z-10 h-[22rem] w-full [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_75%,transparent)] lg:h-full lg:[mask-image:linear-gradient(to_bottom,black_80%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-teak-deep/75 via-teak-deep/75 to-transparent lg:bg-gradient-to-r lg:from-teak-deep/75 lg:via-teak-deep/60 lg:via-35% lg:to-transparent lg:to-60%" />
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
          <a
            href="#doors"
            className="group inline-flex min-h-12 items-center gap-2 rounded-pill bg-gold px-5 font-semibold text-teak shadow-[var(--shadow-button)] transition-[background-color,transform] duration-150 [text-shadow:none] hover:bg-gold-bright active:scale-[0.97]"
          >
            {pick(t('signinTitle'))}
            <ArrowIcon className="size-5 rotate-90 transition-transform duration-150 group-hover:translate-y-0.5" />
          </a>
        </motion.div>
        {boat && (
          <motion.div variants={heroItem} className="mt-5 w-full min-w-0 max-w-sm [text-shadow:none]">
            <Bi k="guestBody" as="p" className="mb-2 text-small text-ink-inverse" mlClassName="mt-1" />
            <a
              href={`/boat/${encodeURIComponent(boat.id)}`}
              className="surface-light group flex w-full min-w-0 items-center gap-3 rounded-card border border-gold-edge bg-kasavu p-3 text-ink shadow-raised"
            >
              <Seal state={boat.status.state} className="size-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{boat.name}</span>
                <span className="mb-1 block break-words text-caption text-ink-muted">{boat.registration}</span>
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
              <div className="mt-5 flex flex-wrap gap-2" aria-label="The three seals">
                <StatusBadge state="verified" />
                <StatusBadge state="declared" />
                <StatusBadge state="overdue" />
              </div>
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

export default function LandingPage() {
  const ready = useFontsReady();
  const chosen = useLangChosen();
  if (!chosen) return <LanguagePage backdrop={<HouseboatScene className="size-full" />} />;
  return (
    <AppShell>
      <Hero ready={ready} />
      <Steps />
      <Doors />
    </AppShell>
  );
}

import { motion, type Variants } from 'motion/react';
import { AppShell } from '../../components/AppShell.tsx';
import { LanguagePage } from '../../components/LanguagePage.tsx';
import { useLangChosen, usePick } from '../../i18n/language.ts';
import { t } from '../../i18n/index.ts';
import { Bi } from '../../components/Bi.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { useFontsReady } from '../../lib/useFontsReady.ts';
import type { StringKey } from '../../i18n/index.ts';
import { HouseboatScene } from './HouseboatScene.tsx';
import { Doors } from './Doors.tsx';
import { ArrowIcon, MicIcon, ProofIcon, SealIcon } from './icons.tsx';

const EASE = [0.23, 1, 0.32, 1] as const;

const heroGroup: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const heroItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

function Hero({ ready }: { ready: boolean }) {
  const pick = usePick();
  return (
    <section aria-labelledby="hero-title" className="relative isolate h-[47rem] overflow-hidden sm:h-[50rem] lg:h-[52rem]">
      <HouseboatScene className="absolute inset-0 -z-10 size-full" />
      <motion.div
        initial="hidden"
        animate={ready ? 'show' : 'hidden'}
        variants={heroGroup}
        className="mx-auto max-w-[76rem] px-5 pt-24 [text-shadow:0_1px_18px_color-mix(in_oklab,var(--color-teak-deep)_70%,transparent)] sm:px-6 sm:pt-32 lg:px-8 lg:pt-40"
      >
        <motion.p variants={heroItem} className="text-caption font-semibold uppercase tracking-[0.16em] text-gold">
          Alappuzha backwaters<span className="hidden sm:inline"> · Vembanad lake</span>
        </motion.p>
        <motion.h1
          variants={heroItem}
          id="hero-title"
          className="mt-3 font-display text-display font-semibold text-ink-inverse [font-variation-settings:'SOFT'_60,'WONK'_1]"
        >
          Kayal Log
        </motion.h1>
        <motion.div variants={heroItem}>
          <Bi
            k="tagline"
            as="p"
            className="mt-4 max-w-[24ch] text-lead font-medium text-ink-inverse sm:text-[1.375rem] lg:max-w-[30ch]"
            mlClassName="mt-1.5 text-gold-bright"
          />
        </motion.div>
        <motion.div variants={heroItem} className="mt-7 hidden sm:block">
          <a
            href="#doors"
            className="group inline-flex min-h-12 items-center gap-2 rounded-pill bg-gold px-5 font-semibold text-teak shadow-[var(--shadow-button)] transition-[background-color,transform] duration-150 [text-shadow:none] hover:bg-gold-bright active:scale-[0.97]"
          >
            {pick(t('signinTitle'))}
            <ArrowIcon className="size-5 rotate-90 transition-transform duration-150 group-hover:translate-y-0.5" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

const STEPS: { n: string; title: StringKey; body: StringKey; Icon: typeof MicIcon }[] = [
  { n: '01', title: 'sayTitle', body: 'sayBody', Icon: MicIcon },
  { n: '02', title: 'proveTitle', body: 'proveBody', Icon: ProofIcon },
  { n: '03', title: 'showTitle', body: 'showBody', Icon: SealIcon },
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
      <ol className="relative mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
        {/* The boat's wake, joining the three steps on wide screens */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[16%] top-[3.25rem] hidden border-t-2 border-dashed border-gold/25 md:block"
        />
        {STEPS.map(({ n, title, body, Icon }, i) => (
          <motion.li
            key={n}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
            className="relative flex flex-col rounded-card border border-transparent bg-teak-raised p-6 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.07),var(--shadow-card)] sm:p-7"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-14 place-items-center rounded-full bg-teak text-gold shadow-[inset_0_0_0_1.5px_var(--color-gold-edge)]">
                <Icon className="size-7" />
              </span>
              <span className="font-display text-title font-semibold tabular-nums text-gold/35">{n}</span>
            </div>
            <Bi k={title} as="h3" className="mt-6 font-display text-heading font-semibold text-ink-inverse" mlClassName="mt-0.5 text-gold" />
            <Bi k={body} as="p" className="mt-3 text-body text-ink-inverse-muted" mlClassName="mt-2" />
            {n === '03' && (
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
  const pick = usePick();
  if (!chosen) return <LanguagePage backdrop={<HouseboatScene className="size-full" />} />;
  return (
    <AppShell
      headerEnd={
        <a
          href="#doors"
          className="inline-flex min-h-11 items-center rounded-pill px-4 text-small font-semibold text-ink-inverse shadow-[inset_0_0_0_1px_oklch(1_0_0/0.25)] transition-colors duration-150 hover:bg-white/10"
        >
          {pick(t('signIn'))}
        </a>
      }
    >
      <Hero ready={ready} />
      <Steps />
      <Doors />
    </AppShell>
  );
}

import { useEffect, type ReactNode } from 'react';
import { motion, type Variants } from 'motion/react';
import { t, type StringKey } from '../i18n/index.ts';
import { setLang, type Lang } from '../i18n/language.ts';
import { BrandMark } from './AppShell.tsx';

const EASE = [0.23, 1, 0.32, 1] as const;
const group: Variants = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const CHOICES: { lang: Lang; name: ReactNode; note: StringKey }[] = [
  { lang: 'en', name: <span lang="en">English</span>, note: 'langEnNote' },
  {
    lang: 'ml',
    name: (
      <span lang="ml" className="font-ml font-semibold tracking-normal">
        മലയാളം
      </span>
    ),
    note: 'langMlNote',
  },
  {
    lang: 'both',
    name: (
      <>
        <span lang="en">English</span> <span className="opacity-50">+</span>{' '}
        <span lang="ml" className="font-ml font-semibold tracking-normal">
          മലയാളം
        </span>
      </>
    ),
    note: 'langBothNote',
  },
];

/** English with Malayalam under it. The visitor has not picked a language yet, so both show. */
function Both({ k, className = '', mlClassName = '' }: { k: StringKey; className?: string; mlClassName?: string }) {
  const text = t(k);
  return (
    <span className={`block ${className}`}>
      <span lang="en" className="block">
        {text.en}
      </span>
      {text.ml && (
        <span lang="ml" className={`block font-ml font-normal tracking-normal ${mlClassName}`}>
          {text.ml}
        </span>
      )}
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="M5 10.5l3.2 3.2L15 6.8" />
    </svg>
  );
}

/**
 * The first screen on a new device: three large language choices. English is pre-selected and
 * a single tap on any choice saves it and opens the app.
 */
export function LanguagePage({ backdrop }: { backdrop?: ReactNode }) {
  useEffect(() => {
    document.title = 'Choose your language · Kayal Log';
  }, []);

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-teak-deep text-ink-inverse">
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {backdrop}
          <div className="absolute inset-0 bg-linear-to-b from-teak-deep/85 via-teak-deep/40 to-transparent" />
        </div>
      )}
      <main
        id="main"
        className="mx-auto w-full max-w-md px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] [text-shadow:0_1px_14px_color-mix(in_oklab,var(--color-teak-deep)_70%,transparent)] sm:pt-16"
      >
        <motion.div initial="hidden" animate="show" variants={group}>
          <motion.div variants={item} className="flex h-12 items-center gap-2">
            <BrandMark className="size-7 text-gold" />
            <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">Kayal Log</span>
          </motion.div>

          <motion.h1 variants={item} className="mt-6 font-display text-title font-semibold">
            <Both k="langTitle" mlClassName="mt-1.5 text-lead font-medium text-gold-bright" />
          </motion.h1>

          <ul className="mt-7 grid gap-3 [text-shadow:none]">
            {CHOICES.map(({ lang, name, note }) => {
              const selected = lang === 'en';
              return (
                <motion.li key={lang} variants={item}>
                  <button
                    type="button"
                    autoFocus={selected}
                    aria-current={selected || undefined}
                    onClick={() => setLang(lang)}
                    className={`flex min-h-20 w-full items-center gap-4 rounded-card px-5 py-4 text-start transition-[scale,background-color,box-shadow] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.98] ${
                      selected
                        ? 'bg-teak-raised shadow-[inset_0_0_0_2px_var(--color-gold),var(--shadow-card)]'
                        : 'bg-teak-raised/90 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12),var(--shadow-card)] hover:bg-teak-raised'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-heading font-semibold">{name}</span>
                      <Both k={note} className="mt-1 text-small text-ink-inverse-muted" mlClassName="mt-0.5" />
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid size-7 shrink-0 place-items-center rounded-full ${
                        selected ? 'bg-gold text-teak' : 'shadow-[inset_0_0_0_1.5px_oklch(1_0_0/0.3)]'
                      }`}
                    >
                      {selected && <Check />}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>

          <motion.p variants={item} className="mt-5 text-small text-ink-inverse-muted">
            <Both k="langLater" mlClassName="mt-0.5" />
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}

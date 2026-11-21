import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BrandMark } from '../../components/AppShell.tsx';
import { LanguageSwitch } from '../../components/LanguageSwitch.tsx';

/** The operator page frame: a lagoon header with the language switch, and a phone-width column. */
export function Shell({ children, headerBelow }: { children: ReactNode; headerBelow?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-teak-deep text-ink-inverse">
      <header className="relative z-10 bg-teak pt-[env(safe-area-inset-top)] shadow-[0_12px_32px_-18px_var(--color-teak-deep)]">
        <div className="mx-auto flex max-w-[36rem] items-center justify-between gap-2 px-4 py-2">
          <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md text-ink-inverse">
            <BrandMark className="size-7 text-gold" />
            <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">Kayal Log</span>
          </Link>
          <LanguageSwitch />
        </div>
        {headerBelow}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-gold-edge),transparent)] opacity-50" />
      </header>
      <main id="main" className="mx-auto max-w-[36rem] px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-5">
        {children}
      </main>
    </div>
  );
}

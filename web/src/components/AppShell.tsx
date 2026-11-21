import type { ReactNode } from 'react';
import { LanguageSwitch } from './LanguageSwitch.tsx';

/** The Kayal Log mark: a kettuvallam in profile. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M2.5 16.5c3 4.2 7.4 5.3 13.5 5.3s10.6-1.4 13.5-10.3c-.8 7.2-5.6 12-13.5 12S5 21.8 2.5 16.5z" fill="currentColor" />
      <path d="M8.2 17.6c0-5.1 3.4-8.2 7.8-8.2s7.8 3.1 7.8 8.2z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

interface AppShellProps {
  children: ReactNode;
  /** Anything to show at the end of the header bar. */
  headerEnd?: ReactNode;
  /** teak: dark header over the page, for the landing page and crew screens. cream: light page. */
  tone?: 'teak' | 'cream';
  /** Id of the main action, for the skip link. */
  skipTo?: string;
  skipLabel?: string;
}

/** Header, main area and footer shared by every screen. */
export function AppShell({ children, headerEnd, tone = 'teak', skipTo = 'main', skipLabel = 'Skip to content' }: AppShellProps) {
  return (
    <div className={`flex min-h-dvh flex-col ${tone === 'cream' ? 'surface-light bg-surface' : 'bg-teak text-ink-inverse'}`}>
      <a
        href={`#${skipTo}`}
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-control bg-gold px-4 py-2 font-semibold text-teak transition-transform focus-visible:translate-y-0"
      >
        {skipLabel}
      </a>
      <header className="absolute inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="inline-flex shrink-0 items-center gap-2 rounded-md text-ink-inverse">
            <BrandMark className="size-7 text-gold" />
            <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">Kayal Log</span>
          </a>
          <div className="flex min-w-0 items-center gap-2">
            {headerEnd}
            <LanguageSwitch />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="bg-teak-deep pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-small text-ink-inverse-muted">
        <div className="mx-auto flex max-w-[76rem] flex-col gap-2 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Built at HackaThoni, Alappuzha, November 2026.</p>
          <p>Malayalam is machine-translated and not yet checked by a native speaker.</p>
        </div>
      </footer>
    </div>
  );
}

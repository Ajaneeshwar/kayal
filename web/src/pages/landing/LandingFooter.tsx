import { t, type StringKey } from '../../i18n/index.ts';
import { BrandMark } from '../../components/AppShell.tsx';
import { Bi } from '../../components/Bi.tsx';

const SOURCE_URL = 'https://github.com/Ajaneeshwar/kayal';

const DOORS: { href: string; k: StringKey }[] = [
  { href: '#door-crew', k: 'crewTitle' },
  { href: '#door-inspector', k: 'inspectorTitle' },
  { href: '#door-guest', k: 'guestTitle' },
];

const link =
  'inline-flex min-h-10 items-center gap-1.5 rounded-md text-small font-semibold text-ink-inverse underline decoration-ink-inverse/30 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-gold';

/** The landing page's footer: who it is for, the goal, the doors again and the source. */
export function LandingFooter() {
  // Sarvam leaves "Source on GitHub" in English; showing it twice in the mixed setting says nothing.
  const source = t('footerSource');
  return (
    <footer className="bg-teak-deep pb-[max(1.75rem,env(safe-area-inset-bottom))] text-ink-inverse-muted">
      {/* The same kasavu band that opens the doors section closes the page. */}
      <div aria-hidden className="h-[3px] bg-gold-edge" />
      <div aria-hidden className="mt-[3px] h-px bg-gold-edge/60" />
      <div className="mx-auto max-w-[76rem] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="max-w-md">
            <a href="/" className="inline-flex items-center gap-2 rounded-md text-ink-inverse">
              <BrandMark className="size-7 text-gold" />
              <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">Kayal Log</span>
            </a>
            <Bi k="footerBuiltFor" as="p" className="mt-3 text-small font-semibold text-gold" mlClassName="mt-0.5 font-normal" />
            <Bi k="footerGoal" as="p" className="mt-1.5 text-body text-ink-inverse-muted" mlClassName="mt-1" />
          </div>
          <nav aria-label="Footer">
            <ul role="list" className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {DOORS.map(({ href, k }) => (
                <li key={href}>
                  <a href={href} className={link}>
                    <Bi k={k} layout="inline" mlClassName="font-medium text-ink-inverse-muted" />
                  </a>
                </li>
              ))}
              <li>
                <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className={link}>
                  <Bi text={{ en: source.en, ml: source.ml === source.en ? '' : source.ml }} layout="inline" mlClassName="font-medium text-ink-inverse-muted" />
                  <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 3.5h6.5V10M12.5 3.5 4 12" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-8 border-t border-ink-inverse/10 pt-5 text-caption">HackaThoni, Alappuzha, 2026</p>
      </div>
    </footer>
  );
}

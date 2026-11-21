import { t } from '../i18n/index.ts';
import { LANGS, setLang, useLang, type Lang } from '../i18n/language.ts';

/** The full name of each choice, in the menu and on the language page. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ml: 'മലയാളം (Malayalam)',
  both: 'English + മലയാളം',
};

/** What the closed switch shows. */
const SHORT: Record<Lang, { text: string; ml: boolean }[]> = {
  en: [{ text: 'EN', ml: false }],
  ml: [{ text: 'മലയാളം', ml: true }],
  both: [
    { text: 'EN', ml: false },
    { text: 'മലയാളം', ml: true },
  ],
};

function GlobeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M2.9 10h14.2M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25M10 2.75c-2 2.1-3 4.5-3 7.25s1 5.15 3 7.25" />
    </svg>
  );
}

/**
 * The language setting as a small pill for a dark header. A native select sits over it, so the
 * phone opens its own picker and the control works with a keyboard and a screen reader.
 */
export function LanguageSwitch({ compact = false, className = '' }: { /** Globe only, for a crowded phone header. */ compact?: boolean; className?: string }) {
  const lang = useLang();
  const label = t('language');
  return (
    <label
      className={`relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill text-small ${compact ? 'px-2.5' : 'px-3'} font-semibold text-ink-inverse
        shadow-[inset_0_0_0_1px_oklch(1_0_0/0.25)] transition-[background-color,scale] duration-[var(--duration-press)] ease-[var(--ease-out)]
        focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus hover:bg-white/10 active:scale-[0.96] ${className}`}
    >
      <GlobeIcon className={`shrink-0 text-gold ${compact ? 'size-5' : 'size-4 max-[400px]:hidden'}`} />
      {/* The mixed setting stacks its two names, so the pill stays narrow on a phone. */}
      <span
        aria-hidden="true"
        className={`whitespace-nowrap ${compact ? 'hidden' : lang === 'both' ? 'flex flex-col items-start gap-0.5 text-[0.6875rem]' : 'flex'}`}
      >
        {SHORT[lang].map((part) => (
          <span key={part.text} lang={part.ml ? 'ml' : 'en'} className={part.ml ? 'font-ml font-medium leading-none' : 'leading-none'}>
            {part.text}
          </span>
        ))}
      </span>
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3 shrink-0 opacity-70">
        <path d="M3 4.5l3 3 3-3" />
      </svg>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={label.ml ? `${label.en} · ${label.ml}` : label.en}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-pill opacity-0"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

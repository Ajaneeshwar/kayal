import { t } from '../i18n/index.ts';
import { LANGS, setLang, useLang, type Lang } from '../i18n/language.ts';
import { Select } from './Select.tsx';

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

/** The language setting as a small pill for a dark header. */
export function LanguageSwitch({ compact = false, className = '' }: { /** Globe only, for a crowded phone header. */ compact?: boolean; className?: string }) {
  const lang = useLang();
  const label = t('language');
  return (
    <Select
      value={lang}
      onChange={(value) => setLang(value as Lang)}
      options={LANGS.map((value) => ({ value, label: LANG_NAMES[value], lang: value === 'en' ? 'en' : 'ml' }))}
      aria-label={label.ml ? `${label.en} · ${label.ml}` : label.en}
      menuAlign="end"
      menuWidth="content"
      className={`shrink-0 ${className}`}
      triggerClassName={`cursor-pointer rounded-pill border border-ink-inverse/25 text-small ${compact ? 'px-2.5' : 'px-3'} font-semibold text-ink-inverse hover:bg-ink-inverse/10 [&>svg:last-child]:size-3`}
      renderValue={
        <>
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
        </>
      }
    />
  );
}

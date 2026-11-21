import type { CSSProperties } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { t, type StringKey, type Text } from '../../i18n/index.ts';
import sarvamUrl from '../../assets/partners/sarvam.svg';
import smallestUrl from '../../assets/partners/smallest.svg';
import devinUrl from '../../assets/partners/devin.svg';

/*
  The partners' official wordmarks, bundled so nothing loads from their servers at the venue.
  Each one is drawn as a mask over the current text colour, so it takes the theme's ink.
*/
const LOGOS = {
  sarvam: { name: 'Sarvam AI', src: sarvamUrl, ratio: 202 / 32, href: 'https://www.sarvam.ai' },
  smallest: { name: 'Smallest AI', src: smallestUrl, ratio: 130 / 24, href: 'https://smallest.ai' },
  devin: { name: 'Devin', src: devinUrl, ratio: 342 / 80, href: 'https://devin.ai' },
} as const;

type LogoKey = keyof typeof LOGOS;

/** One partner wordmark as a link to its site. `className` sets the height and colour. */
export function PartnerLogo({ name, className = '' }: { name: LogoKey; className?: string }) {
  const logo = LOGOS[name];
  const mask = `url("${logo.src}") left center / contain no-repeat`;
  const style: CSSProperties = { aspectRatio: logo.ratio, mask, WebkitMask: mask };
  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center rounded-md transition-opacity duration-150 hover:opacity-100 ${className}`}
    >
      <span aria-hidden="true" className="block h-full bg-current" style={style} />
      <span className="sr-only">{logo.name} (opens in a new tab)</span>
    </a>
  );
}

/** Who it was built with and the HackaThoni partners, in three columns under How it works. */
// Sarvam translated "Powered by" literally, as giving electrical power, so that label stays in English.
const CREDITS: { label: Text; logo: LogoKey; size: string; note?: StringKey }[] = [
  { label: t('footerBuiltWith'), logo: 'devin', size: 'h-12 py-2' },
  { label: { en: 'Powered by', ml: '' }, logo: 'sarvam', size: 'h-12 py-3', note: 'partnerSarvamNote' },
  { label: t('partnerLabel'), logo: 'smallest', size: 'h-12 py-2.5' },
];

export function Partners() {
  return (
    <section aria-labelledby="credits-title" className="mx-auto max-w-[76rem] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
      <Bi k="creditsTitle" as="h2" id="credits-title" className="sr-only" />
      <ul role="list" className="grid border-t border-white/10 pt-8 md:grid-cols-3">
        {CREDITS.map(({ label, logo, size, note }) => (
          <li
            key={logo}
            className="flex flex-col items-start border-t border-white/10 py-6 first:border-t-0 first:pt-0 md:border-s md:border-t-0 md:px-7 md:py-0 md:first:border-s-0 md:first:ps-0 md:last:pe-0"
          >
            <Bi text={label} className="text-caption font-semibold text-gold" mlClassName="mt-0.5 font-normal" />
            <PartnerLogo name={logo} className={`mt-2 text-ink-inverse opacity-85 ${size}`} />
            {note && <Bi k={note} as="p" className="mt-2 max-w-[18rem] text-caption text-ink-inverse-muted" mlClassName="mt-0.5" />}
          </li>
        ))}
      </ul>
    </section>
  );
}

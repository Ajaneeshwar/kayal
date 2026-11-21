import type { CSSProperties } from 'react';
import { Bi } from '../../components/Bi.tsx';
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

/** A slim row of the HackaThoni partners, between How it works and the footer. */
export function Partners() {
  return (
    <section aria-labelledby="partners-title" className="mx-auto max-w-[76rem] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
      <div className="flex flex-col gap-5 border-t border-white/10 pt-8 md:flex-row md:items-start md:gap-14">
        <Bi
          k="partnersTitle"
          as="h2"
          id="partners-title"
          className="shrink-0 text-caption font-semibold text-gold md:min-h-11 md:pt-3.5"
          mlClassName="mt-0.5 font-normal"
        />
        <ul role="list" className="flex flex-wrap items-start gap-x-12 gap-y-5">
          <li className="max-w-[16rem]">
            <PartnerLogo name="sarvam" className="h-11 py-3 text-ink-inverse opacity-85" />
            <Bi k="partnerSarvamNote" as="p" className="mt-1 text-caption text-ink-inverse-muted" mlClassName="mt-0.5" />
          </li>
          <li>
            <PartnerLogo name="smallest" className="h-11 py-2.5 text-ink-inverse opacity-85" />
          </li>
        </ul>
      </div>
    </section>
  );
}

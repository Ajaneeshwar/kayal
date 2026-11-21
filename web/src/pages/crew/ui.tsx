import type { ElementType, ReactNode, SVGProps } from 'react';
import type { Pair } from './i18n.ts';
import { useLang } from '../../i18n/language.ts';

/**
 * A crew string in the chosen language. In the mixed setting Malayalam leads, with its English
 * meaning under it. With one language, the single line takes the main (Malayalam) styling.
 */
export function MlEn({
  text,
  as: Tag = 'span',
  className = '',
  mlClassName = '',
  enClassName = '',
  layout = 'stack',
}: {
  text: Pair;
  as?: ElementType;
  className?: string;
  mlClassName?: string;
  enClassName?: string;
  layout?: 'stack' | 'inline';
}) {
  const lang = useLang();
  if (lang !== 'both' || !text.ml) {
    const ml = lang === 'ml' && text.ml !== '';
    return (
      <Tag className={`${layout === 'inline' ? 'inline-flex' : 'flex flex-col'} ${className}`}>
        <span lang={ml ? 'ml' : 'en'} className={`${ml ? 'font-ml' : ''} leading-snug ${mlClassName}`}>
          {ml ? text.ml : text.en}
        </span>
      </Tag>
    );
  }
  if (layout === 'inline') {
    return (
      <Tag className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
        {text.ml && (
          <>
            <span lang="ml" className={`font-ml leading-snug ${mlClassName}`}>
              {text.ml}
            </span>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
          </>
        )}
        <span lang="en" className={enClassName}>
          {text.en}
        </span>
      </Tag>
    );
  }
  return (
    <Tag className={`flex flex-col ${className}`}>
      {text.ml && (
        <span lang="ml" className={`font-ml leading-snug ${mlClassName}`}>
          {text.ml}
        </span>
      )}
      <span lang="en" className={text.ml ? `text-[0.8em] opacity-75 ${enClassName}` : enClassName}>
        {text.en}
      </span>
    </Tag>
  );
}

/**
 * A line of text the server sent: Malayalam (or whatever was spoken) with English under it.
 * English setting: the English only. Malayalam setting: the original only.
 */
export function SpokenPair({ original, english, language, className = '' }: { original: string; english: string; language: string; className?: string }) {
  const lang = useLang();
  const isMl = language.startsWith('ml');
  const same = original.trim() === english.trim() || !original.trim();
  if (lang === 'en' && english.trim()) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <p lang="en" className="text-lead">
          {english}
        </p>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <p lang={isMl ? 'ml' : language.slice(0, 2)} className={isMl ? 'font-ml text-lead leading-snug' : 'text-lead'}>
        {original || english}
      </p>
      {!same && lang === 'both' && (
        <p lang="en" className="text-small opacity-75">
          {english}
        </p>
      )}
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Mic: (p: IconProps) => (
    <Svg {...p}>
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
    </Svg>
  ),
  Stop: (p: IconProps) => (
    <Svg {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4.5 12.5l4.8 4.8L19.5 7" />
    </Svg>
  ),
  Camera: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </Svg>
  ),
  Keyboard: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </Svg>
  ),
  Back: (p: IconProps) => (
    <Svg {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  ),
  Pin: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Svg>
  ),
  PinOff: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8.2 4.6A6.5 6.5 0 0 1 18.5 10c0 1.7-.6 3.4-1.5 4.9M14.6 17.9C13.2 19.7 12 21 12 21s-6.5-5.6-6.5-11c0-.9.2-1.8.5-2.6M3 3l18 18" />
    </Svg>
  ),
  Speaker: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  ),
  Close: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Pencil: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Svg>
  ),
  Send: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 12l16-8-6 16-2.5-6.5z" />
    </Svg>
  ),
  Alert: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.4v.1" />
    </Svg>
  ),
  WifiOff: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 3l18 18M8.5 16.3a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 4.2-2.4M19 12.6a10 10 0 0 0-2.8-1.9M2 9a15 15 0 0 1 4.3-2.7M22 9a15 15 0 0 0-11-3.9M12 20h.01" />
    </Svg>
  ),
};

/** The Kayal Log mark: a kettuvallam hull and roof. */
export function BoatMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" aria-hidden="true" className={className}>
      <path d="M1 11.5c5 4.6 25 4.6 30 0l-2 5.2c-6.2 3.4-19.8 3.4-26 0z" fill="currentColor" />
      <path d="M6.5 11c.8-6.4 18.2-6.4 19 0z" fill="currentColor" opacity=".55" />
    </svg>
  );
}

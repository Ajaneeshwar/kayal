import type { ReactNode, SVGProps } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { MethodIcon, type Method } from '../../components/MethodIcon.tsx';
import { useLang } from '../../i18n/language.ts';
import type { Kind, Level, OperatorType } from './api.ts';
import { t, type Pair } from './i18n.ts';
import type { OperatorKey } from './strings.ts';

export const TYPE_ORDER: OperatorType[] = ['plant', 'suction_truck', 'mobile_pump', 'waste_collector'];

export const TYPE: Record<OperatorType, { group: OperatorKey; one: OperatorKey; icon: Method }> = {
  plant: { group: 'groupPlant', one: 'typePlant', icon: 'collection_point' },
  suction_truck: { group: 'groupTruck', one: 'typeTruck', icon: 'suction_truck' },
  mobile_pump: { group: 'groupPump', one: 'typePump', icon: 'mobile_pump' },
  waste_collector: { group: 'groupCollector', one: 'typeCollector', icon: 'waste_collector' },
};

export const KIND: Record<Kind, OperatorKey> = {
  sewage_pumpout: 'kindSewage',
  solid_waste: 'kindSolid',
  engine_oil: 'kindOil',
};

export const METHOD: Record<Method, OperatorKey> = {
  collection_point: 'methodPoint',
  suction_truck: 'methodTruck',
  mobile_pump: 'methodPump',
  waste_collector: 'methodCollector',
  waste_bin: 'methodBin',
};

/** The type's icon in a round lagoon well with a gold rim, as on the landing page doors. */
export function TypeMark({ type, size = 'md' }: { type: OperatorType; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-teak text-gold shadow-[inset_0_0_0_1.5px_var(--color-gold-edge)] ${size === 'sm' ? 'size-9' : 'size-11'}`}
    >
      <MethodIcon method={TYPE[type].icon} size={size === 'sm' ? 18 : 22} />
    </span>
  );
}

const CHIP: Record<Level, string> = {
  declared: 'bg-declared-soft text-declared',
  location: 'bg-verified-soft text-verified',
  receipt: 'bg-verified-soft text-verified',
  confirmed: 'bg-confirmed-soft text-confirmed',
};

const LEVEL_KEY: Record<Level, OperatorKey> = {
  declared: 'levelDeclared',
  location: 'levelLocation',
  receipt: 'levelReceipt',
  confirmed: 'levelConfirmed',
};

/** One icon per proof level, so the level never rests on colour alone. */
export function LevelIcon({ level, size = 14 }: { level: Level; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'shrink-0',
  };
  if (level === 'declared')
    return (
      <svg {...common}>
        <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7l-3 2.5v-2.5a1.5 1.5 0 0 1-1.5-1.5z" />
      </svg>
    );
  if (level === 'location')
    return (
      <svg {...common}>
        <path d="M8 14.5s-4.5-3.9-4.5-7.6a4.5 4.5 0 0 1 9 0c0 3.7-4.5 7.6-4.5 7.6z" />
        <circle cx="8" cy="6.9" r="1.5" />
      </svg>
    );
  if (level === 'receipt')
    return (
      <svg {...common}>
        <path d="M3.5 1.8h9v12.4l-1.8-1.2-1.8 1.2L7.1 13l-1.8 1.2-1.8-1.2z" />
        <path d="M6 5.5h4M6 8.5h4" />
      </svg>
    );
  // Confirmed: an office rubber stamp, the receiver's own mark.
  return (
    <svg {...common}>
      <path d="M6.3 8.6V7.2a2.6 2.6 0 1 1 3.4 0v1.4" />
      <path d="M2.8 10.6a1.6 1.6 0 0 1 1.6-1.6h7.2a1.6 1.6 0 0 1 1.6 1.6v1.2H2.8z" />
      <path d="M3.5 14.2h9" />
    </svg>
  );
}

export function LevelChip({ level }: { level: Level }) {
  const lang = useLang();
  const pair = t(LEVEL_KEY[level]);
  // Both languages on one line run past a 360 px card, so the mixed setting stacks them.
  if (lang === 'both' && pair.ml) {
    return (
      <span className={`inline-flex max-w-full items-start gap-1.5 rounded-control px-2.5 py-1.5 text-caption font-semibold ${CHIP[level]}`}>
        <span className="mt-[3px]">
          <LevelIcon level={level} />
        </span>
        <Bi text={pair} className="leading-tight" mlClassName="mt-0.5 text-[0.95em]! opacity-85!" />
      </span>
    );
  }
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-caption font-semibold ${CHIP[level]}`}>
      <LevelIcon level={level} />
      <Bi text={pair} layout="inline" />
    </span>
  );
}

/** A labelled form field on a kasavu card. */
export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: Pair;
  help?: Pair;
  error?: Pair | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-small font-semibold text-ink">
        <Bi text={label} mlClassName="text-ink-muted" />
      </label>
      {help && <Bi as="p" id={`${id}-help`} text={help} className="mt-0.5 text-caption text-ink-muted" />}
      <div className="mt-2">{children}</div>
      <div id={`${id}-error`} role="alert" className="text-small text-overdue">
        {error && <Bi as="p" text={error} className="mt-1.5" />}
      </div>
    </div>
  );
}

/** Text input classes on a kasavu card. 16 px and up, so iOS never zooms. */
export const INPUT =
  'h-12 w-full min-w-0 rounded-control border bg-kasavu px-4 text-body text-ink placeholder:text-ink-muted/70 aria-[invalid=true]:border-overdue border-field-border';

/** A short message on the dark page, such as a failed refresh. */
export function Banner({ text, tone = 'muted', action }: { text: Pair; tone?: 'muted' | 'alert'; action?: ReactNode }) {
  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-control px-4 py-3 text-small ${
        tone === 'alert' ? 'surface-light bg-overdue-soft text-overdue' : 'bg-teak-raised text-ink-inverse'
      }`}
    >
      <Bi text={text} className="min-w-0 flex-1" />
      {action}
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
  Back: (p: IconProps) => (
    <Svg {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  ),
  Chevron: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  ),
  Refresh: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20 11.5A8 8 0 0 0 5.6 6.8L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 12.5a8 8 0 0 0 14.4 4.7l1.6-1.7" />
      <path d="M20 20v-4.5h-4.5" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4.5 12.5l4.8 4.8L19.5 7" />
    </Svg>
  ),
  Cross: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </Svg>
  ),
  Inbox: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 13.5l2.6-7.2A2 2 0 0 1 8 5h8a2 2 0 0 1 1.9 1.3l2.6 7.2" />
      <path d="M3.5 13.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-4.5h-5l-1.5 2.5h-4L8.5 13.5z" />
    </Svg>
  ),
  SignOut: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
      <path d="M10 12h10M16.5 8.5L20 12l-3.5 3.5" />
    </Svg>
  ),
  Arrow: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  ),
};

/** Relative time in English and in Malayalam from Intl, beside each other in the mixed setting. */
export function ago(iso: string, now: number): Pair {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  const fmt = (locale: string) => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (minutes > -1) return rtf.format(0, 'minute');
    if (minutes > -60) return rtf.format(minutes, 'minute');
    if (minutes > -1440) return rtf.format(Math.round(minutes / 60), 'hour');
    return rtf.format(Math.round(minutes / 1440), 'day');
  };
  return { en: fmt('en'), ml: fmt('ml') };
}

const clock = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayClock = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export function clockTime(iso: string | number) {
  return clock.format(new Date(iso));
}

export function dayTime(iso: string) {
  return dayClock.format(new Date(iso));
}

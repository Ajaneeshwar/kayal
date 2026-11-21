import type { SVGProps } from 'react';
import type { BoatState } from '../lib/api.ts';
import { t } from '../i18n/index.ts';
import { useLang } from '../i18n/language.ts';

/**
 * A boat's state, or an entry's receiver answer. `confirmed`: the plant, truck or collector said
 * they received it, the strongest proof. `disputed`: they said they did not, so it stays Declared.
 */
export type BadgeState = BoatState | 'confirmed' | 'disputed';

const STYLES: Record<BadgeState, string> = {
  verified: 'bg-verified-soft text-verified',
  declared: 'bg-declared-soft text-declared',
  overdue: 'bg-overdue-soft text-overdue',
  confirmed: 'bg-confirmed-soft text-confirmed',
  disputed: 'bg-declared-soft text-declared',
};

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function glyph({ size = 14, ...rest }: GlyphProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

/** An office rubber stamp, the receiver's own mark. The same glyph as the operator page. */
export function StampIcon(props: GlyphProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M6.3 8.6V7.2a2.6 2.6 0 1 1 3.4 0v1.4" />
      <path d="M2.8 10.6a1.6 1.6 0 0 1 1.6-1.6h7.2a1.6 1.6 0 0 1 1.6 1.6v1.2H2.8z" />
      <path d="M3.5 14.2h9" />
    </svg>
  );
}

/** A cross: the receiver said the waste did not arrive. */
export function DisputedIcon(props: GlyphProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** One icon per state, so the state never rests on colour alone. */
function StateIcon({ state }: { state: BadgeState }) {
  const common = glyph({});
  if (state === 'confirmed') return <StampIcon />;
  if (state === 'disputed') return <DisputedIcon />;
  if (state === 'verified')
    return (
      <svg {...common}>
        <path d="M8 1.5l1.7 1.3 2.1-.2.6 2 1.8 1.1-.8 2 .8 2-1.8 1.1-.6 2-2.1-.2L8 14.5l-1.7-1.3-2.1.2-.6-2-1.8-1.1.8-2-.8-2 1.8-1.1.6-2 2.1.2z" />
        <path d="M5.6 8.2l1.6 1.6 3.2-3.4" />
      </svg>
    );
  if (state === 'declared')
    return (
      <svg {...common}>
        <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7l-3 2.5v-2.5h0a1.5 1.5 0 0 1-1.5-1.5z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.6v4M8 11.2v.1" />
    </svg>
  );
}

interface StatusBadgeProps {
  state: BadgeState;
  /** In the mixed language setting, show the Malayalam label beside the English one. */
  bilingual?: boolean;
  className?: string;
}

/**
 * Green verified, amber declared only, laterite red overdue: used for status and nothing else.
 * Violet confirmed and amber disputed mark the receiver's answer on an entry.
 */
export function StatusBadge({ state, bilingual = true, className = '' }: StatusBadgeProps) {
  const lang = useLang();
  const label = t(state);
  const mlOnly = lang === 'ml' && label.ml !== '';
  const both = lang === 'both' && bilingual && label.ml !== '';
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 text-caption font-semibold ${
        both ? 'flex-wrap gap-y-0 rounded-control' : 'whitespace-nowrap rounded-pill'
      } ${STYLES[state]} ${className}`}
    >
      <StateIcon state={state} />
      {mlOnly ? (
        <span lang="ml" className="font-ml">
          {label.ml}
        </span>
      ) : (
        <span lang="en">{label.en}</span>
      )}
      {both && (
        <span lang="ml" className="font-normal opacity-85">
          {label.ml}
        </span>
      )}
    </span>
  );
}

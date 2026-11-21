import type { BoatState } from '../lib/api.ts';
import { t } from '../i18n/index.ts';

const STYLES: Record<BoatState, string> = {
  verified: 'bg-verified-soft text-verified',
  declared: 'bg-declared-soft text-declared',
  overdue: 'bg-overdue-soft text-overdue',
};

/** One icon per state, so the state never rests on colour alone. */
function StateIcon({ state }: { state: BoatState }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
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
  state: BoatState;
  /** Show the Malayalam label beside the English one. */
  bilingual?: boolean;
  className?: string;
}

/** Green verified, amber declared only, laterite red overdue. Used for status and nothing else. */
export function StatusBadge({ state, bilingual = true, className = '' }: StatusBadgeProps) {
  const label = t(state);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-caption font-semibold ${STYLES[state]} ${className}`}
    >
      <StateIcon state={state} />
      <span lang="en">{label.en}</span>
      {bilingual && label.ml && (
        <span lang="ml" className="font-normal opacity-85">
          {label.ml}
        </span>
      )}
    </span>
  );
}

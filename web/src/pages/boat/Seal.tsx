import { useId } from 'react';
import { motion } from 'motion/react';
import type { BoatState } from './data.ts';

const TONE: Record<BoatState | 'unknown', string> = {
  verified: 'text-verified',
  declared: 'text-declared',
  overdue: 'text-overdue',
  unknown: 'text-gold-ink',
};

/** A rosette edge: 36 points alternating between two radii, like a pressed wax or foil seal. */
function rosette(points: number, outer: number, inner: number) {
  const d: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d.push(`${(60 + r * Math.cos(a)).toFixed(2)},${(60 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${d.join('L')}Z`;
}
const EDGE = rosette(36, 58, 54.5);

function Mark({ state }: { state: BoatState | 'unknown' }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (state === 'verified') return <path d="M44 61l11 11 22-24" {...stroke} />;
  if (state === 'declared')
    return (
      <g {...stroke} strokeWidth={4}>
        <path d="M41 47a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v15a6 6 0 0 1-6 6H57l-10 9v-9a6 6 0 0 1-6-6z" />
      </g>
    );
  if (state === 'overdue')
    return (
      <g {...stroke}>
        <path d="M60 42v21" />
        <path d="M60 76v.5" strokeWidth={6} />
      </g>
    );
  return (
    <g {...stroke} strokeWidth={4}>
      <path d="M50 52a10 10 0 1 1 14 9c-3 1.4-4 3.4-4 6" />
      <path d="M60 77v.5" strokeWidth={5.5} />
    </g>
  );
}

interface SealProps {
  state: BoatState | 'unknown';
  className?: string;
  /** Stamp the seal onto the page once, on first load. */
  stamp?: boolean;
  /** The words that run around the ring. */
  ring?: string;
}

/** The one large seal on the certificate. Colour, icon and the label beside it all carry the state. */
export function Seal({ state, className = '', stamp = false, ring = 'Kayal Log · Public waste record · Alappuzha · ' }: SealProps) {
  const id = useId().replace(/:/g, '');
  const unknown = state === 'unknown';
  return (
    <motion.svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={`${TONE[state]} ${className}`}
      initial={stamp ? { opacity: 0, scale: 1.18, rotate: -8 } : false}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
    >
      <defs>
        <path id={`ring-${id}`} d="M60 60m-41 0a41 41 0 1 1 82 0a41 41 0 1 1 -82 0" />
      </defs>
      <path d={EDGE} fill="currentColor" opacity={unknown ? 0 : 1} />
      <path d={EDGE} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray={unknown ? '3 3' : undefined} />
      <circle cx="60" cy="60" r="49" fill="var(--color-kasavu)" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
      <text fill="currentColor" fontSize="7.4" fontWeight={650} letterSpacing="1.6" style={{ fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>
        <textPath href={`#ring-${id}`} textLength={2 * Math.PI * 41 - 4} lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      <Mark state={state} />
    </motion.svg>
  );
}

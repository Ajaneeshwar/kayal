import { useEffect, useRef, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './ui.tsx';

export type MicState = 'ready' | 'listening' | 'sending' | 'answered';

const BARS = 31;

/**
 * The live sound wave: the newest microphone level sits in the centre and older levels ripple out
 * to both edges. Bars are updated straight from the animation frame, without React renders.
 */
export function Wave({ level, active }: { level: RefObject<number>; active: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;
    const half = Math.ceil(BARS / 2);
    const history = new Array<number>(half).fill(0);
    let last = 0;
    let frame = 0;
    const draw = (now: number) => {
      if (now - last > 45) {
        last = now;
        history.pop();
        history.unshift(level.current ?? 0);
      }
      for (let i = 0; i < BARS; i += 1) {
        const d = Math.abs(i - (half - 1));
        const v = history[d] ?? 0;
        const falloff = 1 - (d / half) * 0.45;
        const el = bars.current[i];
        if (el) el.style.transform = `scaleY(${Math.max(0.08, Math.min(1, v * falloff * 1.15))})`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, level]);

  return (
    <div
      aria-hidden="true"
      className={`flex h-9 items-center justify-center gap-[3px] transition-opacity duration-[var(--duration-ui)] ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="h-full w-[3px] origin-center scale-y-[0.08] rounded-pill bg-gold-bright will-change-transform"
        />
      ))}
    </div>
  );
}

/** A soft halo behind the button that swells with the voice. */
function Halo({ level, active }: { level: RefObject<number>; active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.style.transform = 'scale(1)';
      return;
    }
    let frame = 0;
    const draw = () => {
      el.style.transform = `scale(${1.04 + (level.current ?? 0) * 0.32})`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, level]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 rounded-full bg-gold/25 transition-opacity duration-[var(--duration-ui)] ${active ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

const ICONS: Record<MicState, typeof Icon.Mic> = {
  ready: Icon.Mic,
  listening: Icon.Send,
  sending: Icon.Mic,
  answered: Icon.Check,
};

export function RecordButton({
  state,
  level,
  label,
  onPress,
}: {
  state: MicState;
  level: RefObject<number>;
  label: string;
  onPress: () => void;
}) {
  const Glyph = ICONS[state];
  return (
    <div className="relative grid size-[7.75rem] shrink-0 place-items-center">
      <Halo level={level} active={state === 'listening'} />
      {/* Sending: a brass arc runs round the button. */}
      {state === 'sending' && (
        <svg aria-hidden="true" viewBox="0 0 124 124" className="absolute inset-0 animate-spin [animation-duration:1.1s]">
          <circle cx="62" cy="62" r="58" fill="none" stroke="var(--color-gold-bright)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="90 300" />
        </svg>
      )}
      <button
        type="button"
        onClick={onPress}
        disabled={state === 'sending'}
        aria-label={label}
        aria-pressed={state === 'listening'}
        className="relative grid size-28 place-items-center rounded-full text-teak
          bg-[radial-gradient(circle_at_34%_28%,var(--color-gold-bright),var(--color-gold)_52%,var(--color-gold-edge))]
          shadow-[var(--shadow-raised),inset_0_1px_0_oklch(1_0_0/0.45),inset_0_-3px_8px_oklch(0.4_0.08_60/0.35)]
          transition-[scale,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)]
          enabled:active:scale-[0.96] disabled:opacity-80"
      >
        <span aria-hidden="true" className="absolute inset-[7px] rounded-full border border-teak/15" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state === 'sending' ? 'ready' : state}
            initial={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="grid place-items-center"
          >
            <Glyph size={state === 'listening' ? 38 : 42} strokeWidth={2.4} />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

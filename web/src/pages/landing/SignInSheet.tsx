import { useEffect, useId, useRef, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import { t } from '../../i18n/index.ts';
import { usePick } from '../../i18n/language.ts';
import { useBoats } from '../../lib/useBoats.ts';
import { CrewDoor, GuestDoor, InspectorDoor } from './Doors.tsx';
import { ReceiverDoor } from './ReceiverDoor.tsx';

export type DoorKey = 'crew' | 'receiver' | 'inspector' | 'guest';

/**
 * Which sign-in a URL hash asks for. `#signin` opens the sheet, `#signin-crew` and the rest open
 * it at that door. The old `#doors` and `#door-crew` links from other pages still work.
 * Returns null for any other hash.
 */
export function signinFromHash(hash: string): { door?: DoorKey } | null {
  const h = hash.replace(/^#/, '');
  if (h === 'signin' || h === 'doors') return {};
  const match = /^(?:signin|door)-(crew|receiver|inspector|guest)$/.exec(h);
  return match ? { door: match[1] as DoorKey } : null;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** A door's first field. It may be disabled while its list loads. */
const FIELD = 'input:not([type="hidden"]), select, textarea, [role="combobox"]';

const WIDE = '(min-width: 48rem)';
function subscribeWide(fn: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', fn);
  return () => query.removeEventListener('change', fn);
}
/** True on a laptop or tablet, where the sheet is a centred dialog instead of a bottom sheet. */
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

interface SignInSheetProps {
  /** The door to scroll to and focus, or none to open at the top. */
  door?: DoorKey;
  onClose: () => void;
}

/**
 * The four sign-in doors in one sheet. A full-height bottom sheet on a phone, a centred dialog
 * from 768 px. Mount it inside AnimatePresence so it can animate out.
 */
export function SignInSheet({ door, onClose }: SignInSheetProps) {
  const pick = usePick();
  const boats = useBoats();
  const wide = useWide();
  const reduced = useReducedMotion();
  const drag = useDragControls();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Open at the asked-for door, with its first field focused. Otherwise focus the sheet itself,
  // so a phone does not raise its keyboard before the visitor has picked a door.
  useEffect(() => {
    const box = scroller.current;
    const sheet = panel.current;
    const target = door ? box?.querySelector<HTMLElement>(`[data-door="${door}"]`) : null;
    sheet?.focus({ preventScroll: true });
    if (!box || !target) return;
    box.scrollTop = Math.max(0, target.offsetTop - 16);
    // The crew and receiver pickers stay disabled until their lists load, so wait for the field,
    // unless the visitor has moved focus first.
    function focusField() {
      const field = target!.querySelector<HTMLElement>(FIELD);
      const ready = field && !field.matches(':disabled');
      if (ready && document.activeElement === sheet) field.focus({ preventScroll: true });
      return Boolean(ready) || document.activeElement !== sheet;
    }
    if (focusField()) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      if (focusField() || ++tries > 80) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [door]);

  // Escape closes, and Tab cycles inside the sheet. An open Select menu handles its own Escape
  // and stops it first.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function startDrag(e: ReactPointerEvent) {
    if (wide || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    drag.start(e);
  }

  function endDrag(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  }

  const panelMotion = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, transition: { duration: 0.15 } } }
    : wide
      ? {
          initial: { opacity: 0, scale: 0.98, y: 8 },
          animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
          exit: { opacity: 0, scale: 0.99, y: 0, transition: { duration: 0.18, ease: EASE_OUT } },
        }
      : {
          initial: { y: '100%' },
          animate: { y: 0, transition: { type: 'spring' as const, duration: 0.45, bounce: 0 } },
          exit: { y: '100%', transition: { duration: 0.28, ease: EASE_DRAWER } },
        };

  const close = t('close');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-teak-deep/75 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
        exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        {...panelMotion}
        drag={wide ? false : 'y'}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.9 }}
        onDragEnd={endDrag}
        className="surface-light relative flex h-[calc(100dvh-max(0.75rem,env(safe-area-inset-top)))] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-raised outline-none md:h-auto md:max-h-[min(60rem,calc(100dvh-3rem))] md:max-w-[62rem] md:rounded-card"
      >
        {/* Kasavu border: a gold band with a fine second line, like the edge of a Kerala sari. */}
        <div aria-hidden="true" className="h-[3px] shrink-0 bg-gold-edge" />
        <div aria-hidden="true" className="mt-[3px] h-px shrink-0 bg-gold-edge/60" />
        <div onPointerDown={startDrag} className="shrink-0 touch-none md:touch-auto">
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-pill bg-ink/20 md:hidden" />
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-3 md:px-8 md:pb-5 md:pt-7">
            <div className="min-w-0">
              <Bi k="signinSheetTitle" as="h2" id={titleId} className="font-display text-title font-semibold text-ink" mlClassName="mt-1 text-gold-ink" />
              <p className="mt-2 text-small text-ink-muted">Demo sign-ins for HackaThoni, not real accounts.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={pick(close)}
              className="-me-2 grid size-11 shrink-0 place-items-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-line active:scale-[0.96]"
            >
              <CloseIcon className="size-6" />
            </button>
          </div>
        </div>
        <div
          ref={scroller}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 md:px-8 md:pb-8"
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:gap-5">
            <div data-door="crew" className="min-w-0">
              <CrewDoor {...boats} />
            </div>
            <div data-door="receiver" className="min-w-0">
              <ReceiverDoor />
            </div>
            <div data-door="inspector" className="min-w-0">
              <InspectorDoor />
            </div>
            <div data-door="guest" className="min-w-0">
              <GuestDoor {...boats} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Bi } from '../../components/Bi.tsx';
import type { Text } from '../../i18n/index.ts';

interface Props {
  title: Text;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra class on the dialog, e.g. for print rules. */
  className?: string;
  width?: string;
}

/** A native modal dialog in kasavu cream. Escape and the backdrop close it. */
export function Dialog({ title, subtitle, onClose, children, className = '', width = 'max-w-lg' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) {
      el.showModal();
      // showModal focuses the close button; a form should start in its first field.
      el.querySelector<HTMLElement>('input:not([type=checkbox]), textarea, select')?.focus();
    }
    return () => el?.close();
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`kl-dialog surface-light m-auto w-[calc(100%-2rem)] ${width} overflow-visible bg-transparent p-0 ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        className="kl-dialog-panel relative rounded-card border border-gold-edge/70 bg-kasavu p-6 shadow-[var(--shadow-raised)] sm:p-7"
      >
        <span aria-hidden="true" className="kl-no-print pointer-events-none absolute inset-[5px] rounded-[calc(var(--radius-card)-5px)] border-[1.5px] border-gold-edge/50" />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Bi as="h2" text={title} className="font-display text-heading font-semibold" />
              {subtitle && <p className="mt-1 text-small text-ink-muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="kl-no-print -me-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-line/60 hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </motion.div>
    </dialog>,
    document.body,
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-small font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'block min-h-12 w-full rounded-control border border-field-border bg-white/70 px-3.5 text-body text-ink placeholder:text-ink-muted/70 transition-[border-color,box-shadow] duration-150 focus:border-gold-ink focus:outline-none focus-visible:outline-none focus:shadow-[0_0_0_3px_var(--color-focus)]';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-overdue-soft px-3.5 py-2.5 text-small font-medium text-overdue">
      {message}
    </p>
  );
}

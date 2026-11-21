import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shows a spinner, keeps the width and blocks repeat presses. */
  busy?: boolean;
  block?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // Coir and brass gold: the main action.
  primary:
    'bg-gold text-teak shadow-[var(--shadow-button)] hover:bg-gold-bright',
  // Wood outline, for a second action beside the main one.
  secondary:
    'bg-transparent text-current border border-current/35 hover:border-current/70',
  quiet: 'bg-transparent text-current underline underline-offset-4 decoration-current/40 hover:decoration-current',
};

export function Button({ variant = 'primary', busy = false, block = false, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      aria-busy={busy || undefined}
      data-busy={busy || undefined}
      className={`relative inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 py-2.5 text-body font-semibold
        transition-[transform,background-color,border-color,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)]
        enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55 data-busy:pointer-events-none
        ${block ? 'w-full' : ''} ${VARIANTS[variant]} ${className}`}
    >
      <span className={`inline-flex items-center gap-2 transition-opacity duration-150 ${busy ? 'opacity-0' : ''}`}>{children}</span>
      {busy && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
      )}
    </button>
  );
}

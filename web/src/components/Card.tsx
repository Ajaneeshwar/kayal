import type { ElementType, ReactNode } from 'react';

interface CardProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** The gold kasavu band inset from the edge, like the border of a Kerala sari. */
  kasavu?: boolean;
  id?: string;
  'aria-labelledby'?: string;
}

/** Kasavu cream with a gold edge. Cards and the boat certificate use it. */
export function Card({ as: Tag = 'div', className = '', kasavu = true, children, ...rest }: CardProps) {
  return (
    <Tag
      {...rest}
      className={`surface-light relative rounded-card border border-gold-edge/70 bg-kasavu shadow-[var(--shadow-card)] ${className}`}
    >
      {kasavu && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[5px] rounded-[calc(var(--radius-card)-5px)] border-[1.5px] border-gold-edge/55"
        />
      )}
      <div className="relative">{children}</div>
    </Tag>
  );
}

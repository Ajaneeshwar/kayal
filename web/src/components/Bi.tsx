import type { ElementType, ReactNode } from 'react';
import { t, type StringKey, type Text } from '../i18n/index.ts';

interface BiProps {
  /** A key from i18n/strings.ts, or a ready pair. */
  k?: StringKey;
  text?: Text;
  as?: ElementType;
  /** stack: English, Malayalam under it. inline: on one line. ml-first: Malayalam leads. */
  layout?: 'stack' | 'inline' | 'ml-first';
  className?: string;
  /** Classes for the Malayalam line, which is smaller by default. */
  mlClassName?: string;
  enClassName?: string;
  id?: string;
}

/**
 * Malayalam with its English meaning beside it. Every Malayalam string on screen goes through
 * this, so a reader who knows only one of the two languages is never left out.
 */
export function Bi({ k, text, as: Tag = 'span', layout = 'stack', className = '', mlClassName = '', enClassName = '', id }: BiProps) {
  const pair = text ?? (k ? t(k) : { en: '', ml: '' });
  const enNode: ReactNode = (
    <span lang="en" className={`${layout === 'inline' ? '' : 'block'} ${enClassName}`}>
      {pair.en}
    </span>
  );
  const mlNode: ReactNode = pair.ml ? (
    <span
      lang="ml"
      className={`${layout === 'inline' ? '' : 'block'} font-ml font-normal tracking-normal ${
        layout === 'ml-first' ? '' : 'text-[0.78em] opacity-80'
      } ${mlClassName}`}
    >
      {pair.ml}
    </span>
  ) : null;

  if (layout === 'inline') {
    return (
      <Tag id={id} className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
        {enNode}
        {mlNode && <span aria-hidden="true" className="opacity-40">·</span>}
        {mlNode}
      </Tag>
    );
  }
  return (
    <Tag id={id} className={className}>
      {layout === 'ml-first' ? mlNode : enNode}
      {layout === 'ml-first' ? enNode : mlNode}
    </Tag>
  );
}

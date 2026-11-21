import type { ElementType, ReactNode } from 'react';
import { t, type StringKey, type Text } from '../i18n/index.ts';
import { useLang } from '../i18n/language.ts';

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
 * A string in the visitor's chosen language. In the mixed setting, Malayalam sits beside its
 * English meaning. Every Malayalam string on screen goes through this.
 */
export function Bi({ k, text, as: Tag = 'span', layout = 'stack', className = '', mlClassName = '', enClassName = '', id }: BiProps) {
  const lang = useLang();
  const pair = text ?? (k ? t(k) : { en: '', ml: '' });

  // One language: the single line takes the main (English) styling.
  if (lang === 'en' || (lang === 'ml' && !pair.ml)) {
    return (
      <Tag id={id} className={className}>
        <span lang="en" className={`${layout === 'inline' ? '' : 'block'} ${enClassName}`}>
          {pair.en}
        </span>
      </Tag>
    );
  }
  if (lang === 'ml') {
    return (
      <Tag id={id} className={className}>
        <span lang="ml" className={`${layout === 'inline' ? '' : 'block'} font-ml tracking-normal normal-case [overflow-wrap:anywhere] ${enClassName}`}>
          {pair.ml}
        </span>
      </Tag>
    );
  }

  const enNode: ReactNode = (
    <span lang="en" className={`${layout === 'inline' ? '' : 'block'} ${enClassName}`}>
      {pair.en}
    </span>
  );
  const mlNode: ReactNode = pair.ml ? (
    <span
      lang="ml"
      className={`${layout === 'inline' ? '' : 'block'} font-ml font-normal tracking-normal [overflow-wrap:anywhere] ${
        layout === 'ml-first' ? '' : 'text-[0.9em] opacity-90'
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

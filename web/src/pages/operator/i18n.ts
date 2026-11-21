import { en, type OperatorKey } from './strings.ts';
import mlFile from './ml.json';

export interface Pair {
  en: string;
  /** Empty until translated. Unverified until a native speaker has checked it. */
  ml: string;
}

const ml = mlFile as Record<string, { en: string; ml: string } | undefined>;

/**
 * The English string and its Malayalam. A stale translation is dropped. The translator adds a full
 * stop to some short labels, so one is removed where the English has none.
 */
export function t(key: OperatorKey): Pair {
  const entry = ml[key];
  if (!entry || entry.en !== en[key]) return { en: en[key], ml: '' };
  const text = /[.?!)]$/.test(en[key]) ? entry.ml : entry.ml.replace(/\.$/, '');
  return { en: en[key], ml: text };
}

/** Fills `{name}`-style placeholders in both languages. */
export function fill(pair: Pair, values: Record<string, string>): Pair {
  const sub = (s: string) => s.replace(/\{(\w+)\}/g, (all, k: string) => values[k] ?? all);
  return { en: sub(pair.en), ml: pair.ml ? sub(pair.ml) : '' };
}

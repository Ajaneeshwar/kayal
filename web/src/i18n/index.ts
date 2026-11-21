import { en, type StringKey } from './strings.ts';
import mlFile from './ml.json';

export type { StringKey };
export interface Text {
  en: string;
  /** Empty until translated. Unverified until a native speaker has checked it. */
  ml: string;
}

const ml = mlFile as Record<string, { en: string; ml: string } | undefined>;

/** The English string and its Malayalam translation. A stale translation is dropped. */
export function t(key: StringKey): Text {
  const entry = ml[key];
  return { en: en[key], ml: entry && entry.en === en[key] ? entry.ml : '' };
}

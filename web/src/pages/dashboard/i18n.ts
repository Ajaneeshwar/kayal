import type { Text } from '../../i18n/index.ts';
import { en, type DashKey } from './strings.ts';
import mlFile from './ml.json';

const ml = mlFile as Record<string, { en: string; ml: string } | undefined>;

/** English and its Malayalam (unverified). A translation of an older English string is dropped. */
export function d(key: DashKey): Text {
  const entry = ml[key];
  return { en: en[key], ml: entry && entry.en === en[key] ? entry.ml : '' };
}

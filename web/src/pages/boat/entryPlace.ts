import type { Entry } from './data.ts';

export function entryPlace(entry: Pick<Entry, 'method' | 'verification' | 'facilityMentioned'>): string | null {
  const matched = (entry.method ?? 'collection_point') === 'collection_point' && entry.verification.reason === null;
  return (matched && entry.verification.facilityName) || entry.facilityMentioned || null;
}

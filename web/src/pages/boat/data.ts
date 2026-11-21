// API calls and record shapes for the boat record page. See docs/API.md.
import { en, type BoatStringKey } from './strings.ts';
import mlFile from './ml.json';

export type BoatState = 'verified' | 'declared' | 'overdue';
export type Level = 'declared' | 'location' | 'receipt';
export type Kind = 'sewage_pumpout' | 'solid_waste' | 'engine_oil';
export type Reason = 'no_location' | 'no_facility' | 'too_far' | 'closed' | null;

export interface LastHandover {
  at: string;
  daysAgo: number;
  level: Level;
  facilityName: string | null;
}

export interface BoatRecord {
  id: string;
  name: string;
  registration: string;
  status: { state: BoatState; overdueDays: number; lastSewage: LastHandover | null; lastSolid: LastHandover | null };
}

export interface Entry {
  id: string;
  boatId: string;
  at: string;
  kind: Kind;
  summaryEn: string;
  quantity: string | null;
  facilityMentioned: string | null;
  heard: { original: string; language: string; english: string };
  verification: { level: Level; facilityId: string | null; facilityName: string | null; distanceM: number | null; reason: Reason };
  photo: { file: string; isReceipt: boolean; issuer: string | null; date: string | null; amount: string | null; caption: string | null } | null;
  source: 'voice' | 'text' | 'sample';
  hash: string;
  corrected?: boolean;
  correctedAt?: string | null;
}

export interface Chain {
  ok: boolean;
  count: number;
  brokenAt: number | null;
}

export interface Text {
  en: string;
  ml: string;
}

const ml = mlFile as Record<string, { en: string; ml: string } | undefined>;

/** The English string and its Malayalam. A translation of an older English source is dropped. */
export function bt(key: BoatStringKey): Text {
  const entry = ml[key];
  return { en: en[key], ml: entry && entry.en === en[key] ? entry.ml : '' };
}

export class NotFoundError extends Error {}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 404) throw new NotFoundError(data.error || 'Not found');
  if (!res.ok) throw new Error(data.error || `The request failed (${res.status}).`);
  return data as T;
}

export function fetchBoat(id: string, signal?: AbortSignal) {
  return getJson<{ boat: BoatRecord; entries: Entry[] }>(`/api/boats/${encodeURIComponent(id)}`, signal);
}

/** The chain covers every boat, so it comes from the state route. */
export function fetchState(signal?: AbortSignal) {
  return getJson<{ boats: BoatRecord[]; chain: Chain }>('/api/state', signal);
}

export interface ReportInput {
  boatId: string;
  photoDataUri: string;
  note: string | null;
  location: { lat: number; lon: number; accuracy: number } | null;
}

export async function sendReport(input: ReportInput): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('The report did not send. Check your connection and try again.');
  }
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(data.error || `The report did not send (${res.status}). Try again in a minute.`);
}

/** Resize to at most 1280 px on the long side and return a JPEG data URI, as the reports route takes. */
export async function photoToDataUri(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That file is not a photo this phone can read. Choose a JPEG or PNG photo.');
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}

export function currentPosition(): Promise<{ lat: number; lon: number; accuracy: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

export function daysAgo(n: number) {
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return `${n} days ago`;
}

export function distance(metres: number) {
  return metres < 950 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}

export const KIND: Record<Kind, BoatStringKey> = {
  sewage_pumpout: 'kindSewage',
  solid_waste: 'kindSolid',
  engine_oil: 'kindOil',
};

export const LEVEL: Record<Level, { key: BoatStringKey; tone: 'verified' | 'declared'; meaning: string }> = {
  receipt: { key: 'levelReceipt', tone: 'verified', meaning: 'The phone was at an open collection point and the receipt photo was read.' },
  location: { key: 'levelLocation', tone: 'verified', meaning: 'The phone was at an open collection point when the crew logged it.' },
  declared: { key: 'levelDeclared', tone: 'declared', meaning: 'The crew said it. Nothing else confirms it.' },
};

/** Why an entry has the proof level it has, in one sentence. */
export function reasonText(e: Entry): string {
  const { level, reason, facilityName, distanceM } = e.verification;
  if (level === 'receipt') return `The phone was at ${facilityName ?? 'a collection point'}, and the receipt photo was read.`;
  if (level === 'location') return `The phone was at ${facilityName ?? 'a collection point'} when the crew logged it.`;
  switch (reason) {
    case 'too_far':
      return distanceM != null && facilityName
        ? `The phone was ${distance(distanceM)} from ${facilityName}, too far to confirm.`
        : 'The phone was too far from a collection point to confirm.';
    case 'closed':
      return `${facilityName ?? 'The nearest point'} is marked closed, so it cannot confirm the handover.`;
    case 'no_location':
      return 'The crew did not share the phone’s location.';
    case 'no_facility':
      return 'No collection point for this waste is listed nearby.';
    default:
      return 'Nothing else confirms it.';
  }
}

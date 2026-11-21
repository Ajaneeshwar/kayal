// API calls and record shapes for the crew page. Routes are described in docs/API.md.
import type { BoatState } from '../../lib/api.ts';

export type Kind = 'sewage_pumpout' | 'solid_waste' | 'engine_oil';
export type Level = 'declared' | 'location' | 'receipt';
export type Reason = 'no_location' | 'no_facility' | 'too_far' | 'closed' | null;

export interface Facility {
  id: string;
  name: string;
  accepts: ('sewage' | 'solid' | 'oil')[];
  lat: number;
  lon: number;
  radiusM: number;
  open: boolean;
}

export interface LastEvent {
  at: string;
  daysAgo: number;
  level: Level;
  facilityName: string | null;
}

export interface Boat {
  id: string;
  name: string;
  registration: string;
  status: { state: BoatState; overdueDays: number; lastSewage: LastEvent | null; lastSolid: LastEvent | null };
}

export interface Heard {
  original: string;
  language: string;
  english: string;
}

export interface Reply {
  id: string;
  english: string;
  local: string;
  language: string;
}

export interface Entry {
  id: string;
  boatId: string;
  at: string;
  kind: Kind;
  summaryEn: string;
  quantity: string | null;
  facilityMentioned: string | null;
  heard: Heard;
  verification: { level: Level; facilityId: string | null; facilityName: string | null; distanceM: number | null; reason: Reason };
  photo: { file: string; isReceipt: boolean; issuer: string | null; date: string | null; amount: string | null; caption: string | null } | null;
  corrected?: boolean;
}

export interface LogResult {
  stored: boolean;
  kind: Kind | 'question' | 'other';
  heard?: Heard;
  reply?: Reply;
  entry?: Entry;
  status?: Boat['status'];
  correctionToken?: string;
}

export interface LogPayload {
  boatId: string;
  text?: string;
  audioBase64?: string;
  audioMime?: string;
  lat?: number;
  lon?: number;
  accuracy?: number;
  photoBase64?: string | null;
}

/** status 0 means the request never reached the server. `body` holds any reply the server sent with the error. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Partial<LogResult> | null = null,
  ) {
    super(message);
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, body === undefined ? undefined : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No network.', 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(data?.error ?? `The server answered ${res.status}.`, res.status, data as Partial<LogResult> | null);
  return data as T;
}

export const getBoat = (id: string) =>
  request<{ boat: Boat; entries: Entry[]; facilities: Facility[] }>(`/api/boats/${encodeURIComponent(id)}`);

export const postLog = (payload: LogPayload) => request<LogResult>('/api/log', payload);

export const speak = (replyId: string) => request<{ audioBase64: string; mime: string }>('/api/speak', { replyId });

export const correctQuantity = (entryId: string, boatId: string, quantity: string, correctionToken: string) =>
  request<{ entry: Entry }>(`/api/log/${encodeURIComponent(entryId)}/correction`, { boatId, quantity, correctionToken });

/** Straight-line distance in metres. */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: m < 10_000 ? 1 : 0 }).format(m / 1000)} km`;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const PHOTO_MAX_SIDE = 1280;

/** Shrinks a camera photo to at most 1280 px on its long side, as a JPEG. */
export async function shrinkPhoto(file: File): Promise<{ base64: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { base64: dataUrl.split(',')[1] ?? '', previewUrl: dataUrl };
}

/**
 * A tenth of a second of silence. Playing it inside the tap unlocks the audio element, so the
 * spoken reply can play later without a second tap, which phones otherwise block.
 */
export function silentWavUrl() {
  const rate = 8000;
  const samples = rate / 10;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const ascii = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}

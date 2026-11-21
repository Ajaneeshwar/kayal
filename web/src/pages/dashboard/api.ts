// API calls for the inspector dashboard. Routes are described in docs/API.md.
import { ADMIN_PIN_KEY, readAdminPin, type BoatState } from '../../lib/api.ts';
import type { Method } from '../../components/MethodIcon.tsx';

export type Level = 'declared' | 'location' | 'receipt';
export type Waste = 'sewage' | 'solid' | 'oil';

export interface LastHandover {
  at: string;
  daysAgo: number;
  level: Level;
  facilityName: string | null;
}

export interface Boat {
  id: string;
  name: string;
  registration: string;
  status: { state: BoatState; overdueDays: number; lastSewage: LastHandover | null; lastSolid: LastHandover | null };
}

export interface Facility {
  id: string;
  name: string;
  operator: string | null;
  note: string | null;
  accepts: Waste[];
  lat: number;
  lon: number;
  radiusM: number;
  open: boolean;
}

export interface Entry {
  id: string;
  boatId: string;
  at: string;
  kind: 'sewage_pumpout' | 'solid_waste' | 'engine_oil';
  summaryEn: string;
  quantity: string | null;
  heard: { original: string; language: string; english: string } | null;
  location: { lat: number; lon: number; accuracy: number | null } | null;
  verification: { level: Level; facilityId: string | null; facilityName: string | null; distanceM: number | null; reason: string | null };
  photo: { file: string; isReceipt: boolean; caption: string | null } | null;
  source: 'voice' | 'text' | 'sample';
  hash: string;
  /** Absent on entries saved before handover methods existed. */
  method?: Method;
  vehicleNumber?: string | null;
  handedTo?: string | null;
  /** Withdrawn by an inspector. Missing on a server without the void route; read it as false. */
  voided?: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
}

export interface Chain {
  ok: boolean;
  count: number;
  brokenAt: number | null;
}

export interface State {
  boats: Boat[];
  facilities: Facility[];
  entries: Entry[];
  weeklyEntryCount: number;
  chain: Chain;
  overdueDays: number;
  adminPinRequired: boolean;
  /** Tourist reports, newest first. Missing on a server without the reports route. */
  reports?: Record<string, unknown>[];
}

/** A tourist report. The route is new, so the shape is read loosely. */
export interface Report {
  id: string;
  boatId: string | null;
  at: string | null;
  text: string;
  photoUrl: string | null;
  reading: string | null;
  reviewed: boolean;
  /** The vision model's guess that the photo shows waste in the water. */
  wasteSeen: boolean | null;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function pinHeader(): Record<string, string> {
  const pin = readAdminPin();
  return pin ? { 'x-admin-pin': pin } : {};
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { headers: pinHeader() }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', ...pinHeader() }, body: JSON.stringify(body) };
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError('The server did not answer. Check the connection and try again.', 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error || `The request failed (${res.status}).`, res.status);
  return data as T;
}

export const fetchState = () => request<State>('/api/state');

export const setFacilityOpen = (id: string, open: boolean) =>
  request<{ facility: Facility }>(`/api/facilities/${encodeURIComponent(id)}/status`, { open });

export const addBoat = (name: string, registration: string) => request<{ boat: Boat }>('/api/boats', { name, registration });

export const addFacility = (input: { name: string; lat: number; lon: number; accepts: Waste[] }) =>
  request<{ facility: Facility }>('/api/facilities', input);

type Loose = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

function photoUrl(r: Loose): string | null {
  const photo = r.photo as Loose | string | null | undefined;
  const file = typeof photo === 'string' ? photo : str(photo?.file) ?? str(r.photoFile) ?? str(r.file);
  if (!file) return null;
  return file.startsWith('/') || file.startsWith('http') || file.startsWith('data:') ? file : `/uploads/${file}`;
}

function normaliseReport(r: Loose, i: number): Report {
  const photo = (typeof r.photo === 'object' ? r.photo : null) as Loose | null;
  const analysis = (r.analysis ?? r.reading ?? null) as Loose | string | null;
  return {
    id: str(r.id) ?? String(i),
    boatId: str(r.boatId),
    at: str(r.at) ?? str(r.createdAt),
    text: str(r.note) ?? str(r.text) ?? str(r.message) ?? str(r.comment) ?? '',
    photoUrl: photoUrl(r),
    reading:
      (typeof analysis === 'string' ? analysis : str(analysis?.summary) ?? str(analysis?.reading)) ??
      str(r.description) ?? str(r.summaryEn) ?? str(r.aiReading) ?? str(r.caption) ?? str(photo?.caption),
    reviewed: Boolean(r.reviewed ?? r.reviewedAt ?? (r.status === 'reviewed' ? true : null)),
    wasteSeen: typeof r.plausibleWasteInWater === 'boolean' ? r.plausibleWasteInWater : null,
  };
}

/** Tourist reports from /api/state, or null when the server does not send them. */
export function reportsOf(state: State): Report[] | null {
  return Array.isArray(state.reports) ? state.reports.map((r, i) => normaliseReport(r as Loose, i)) : null;
}

/** Withdraws an entry. It stays in the chain, marked voided, and stops counting toward the boat's status. */
export const voidEntry = (id: string, reason: string) =>
  request<{ entry: Entry }>(`/api/log/${encodeURIComponent(id)}/void`, { reason });

export const markReportReviewed = (id: string) =>
  request<unknown>(`/api/reports/${encodeURIComponent(id)}/review`, {});

export function signOut() {
  try {
    sessionStorage.removeItem(ADMIN_PIN_KEY);
  } catch {
    // Nothing stored.
  }
  window.location.assign('/');
}

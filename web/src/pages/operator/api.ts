// API calls and record shapes for the operator page. Routes are described in docs/API.md.
import type { Method } from '../../components/MethodIcon.tsx';

export type OperatorType = 'plant' | 'suction_truck' | 'mobile_pump' | 'waste_collector';
export type Kind = 'sewage_pumpout' | 'solid_waste' | 'engine_oil';
export type Level = 'declared' | 'location' | 'receipt' | 'confirmed';
export type Decision = 'received' | 'not_received';

export interface Operator {
  id: string;
  name: string;
  type: OperatorType;
  facilityId: string | null;
  vehicleNumber: string | null;
}

export interface BoatRef {
  id: string;
  name: string;
  registration: string;
}

export interface FacilityRef {
  id: string;
  name: string;
}

export interface Confirmation {
  decision: Decision;
  at: string;
  operatorId: string;
  operatorName: string;
  operatorType: OperatorType;
  quantity: string | null;
  note: string | null;
}

export interface Entry {
  id: string;
  boatId: string;
  at: string;
  kind: Kind;
  quantity: string | null;
  method?: Method;
  vehicleNumber?: string | null;
  handedTo?: string | null;
  verification: { level: Level; facilityId: string | null; facilityName: string | null; reason: string | null };
  handoverCode?: string;
  confirmation?: Confirmation | null;
  disputed?: boolean;
  voided?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Session {
  id: string;
  code: string;
}

/* Kept for this browser tab only, like the inspector PIN. */
const SESSION_KEY = 'kayal.operator';

export function readSession(): Session | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null;
    return v && typeof v.id === 'string' && typeof v.code === 'string' ? { id: v.id, code: v.code } : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // Private mode: the operator signs in again after a reload.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
}

function headers(s: Session, json = false): HeadersInit {
  return {
    'x-operator-id': s.id,
    'x-operator-code': s.code,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, 'Network error');
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `${res.status}`);
  return body as T;
}

export interface Directory {
  operators: Operator[];
  boats: Map<string, BoatRef>;
  facilities: Map<string, FacilityRef>;
  /** The public feed, newest first. Used to explain an entry this operator cannot confirm. */
  entries: Entry[];
}

export async function getDirectory(signal?: AbortSignal): Promise<Directory> {
  const data = await call<{ operators?: Operator[]; boats?: BoatRef[]; facilities?: FacilityRef[]; entries?: Entry[] }>('/api/state', { signal });
  return {
    operators: Array.isArray(data.operators) ? data.operators : [],
    boats: new Map((data.boats ?? []).map((b) => [b.id, b])),
    facilities: new Map((data.facilities ?? []).map((f) => [f.id, f])),
    entries: Array.isArray(data.entries) ? data.entries : [],
  };
}

export async function getPending(s: Session, signal?: AbortSignal) {
  const data = await call<{ operator: Operator; pending: Entry[] }>(`/api/operators/${encodeURIComponent(s.id)}/pending`, {
    headers: headers(s),
    signal,
  });
  const pending = [...(data.pending ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return { operator: data.operator, pending };
}

export async function findByCode(s: Session, code: string) {
  const { entry } = await call<{ entry: Entry }>(
    `/api/operators/${encodeURIComponent(s.id)}/handover/${encodeURIComponent(code)}`,
    { headers: headers(s) },
  );
  return entry;
}

export async function confirmEntry(s: Session, entryId: string, body: { decision: Decision; quantity?: string; note?: string }) {
  return call<{ entry: Entry; confirmation: Confirmation }>(`/api/log/${encodeURIComponent(entryId)}/confirm`, {
    method: 'POST',
    headers: headers(s, true),
    body: JSON.stringify(body),
  });
}

/**
 * Whether the server has the truck-unload route. A GET on a known POST route answers 405 and an
 * unknown path answers 404, so this asks without changing anything.
 */
export async function hasUnloadRoute(s: Session, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`/api/operators/${encodeURIComponent(s.id)}/unload`, { headers: headers(s), signal });
    return res.status !== 404;
  } catch {
    return false;
  }
}

export interface Unload {
  id: string;
  at: string;
  vehicleNumber: string;
  quantity: string;
}

export async function recordUnload(s: Session, body: { vehicleNumber: string; quantity: string }) {
  return call<{ unload: Unload }>(`/api/operators/${encodeURIComponent(s.id)}/unload`, {
    method: 'POST',
    headers: headers(s, true),
    body: JSON.stringify(body),
  });
}

/** Handover codes use these characters only (lib/confirm.mjs), so 0, 1, I, L and O never appear. */
export const HANDOVER_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function normaliseCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isHandoverCode(code: string) {
  return code.length === 6 && [...code].every((c) => HANDOVER_ALPHABET.includes(c));
}

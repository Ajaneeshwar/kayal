// Calls to the Kayal Log API. Routes are described in docs/API.md.

export type BoatState = 'verified' | 'declared' | 'overdue';

export interface Boat {
  id: string;
  name: string;
  registration: string;
  status: { state: BoatState };
}

export async function fetchBoats(signal?: AbortSignal): Promise<Boat[]> {
  const res = await fetch('/api/state', { signal });
  if (!res.ok) throw new Error(`GET /api/state returned ${res.status}`);
  const data: unknown = await res.json();
  const boats = (data as { boats?: unknown }).boats;
  return Array.isArray(boats) ? (boats as Boat[]) : [];
}

export type SigninResult = 'ok' | 'wrong' | 'error';

export async function signInInspector(pin: string): Promise<SigninResult> {
  try {
    const res = await fetch('/api/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'inspector', pin }),
    });
    if (res.ok) return 'ok';
    return res.status === 401 ? 'wrong' : 'error';
  } catch {
    return 'error';
  }
}

/*
  The inspector PIN is kept for this browser tab only and sent as the `x-admin-pin` header,
  the header the admin routes in server.mjs check.
*/
export const ADMIN_PIN_KEY = 'kayal.adminPin';

export function saveAdminPin(pin: string) {
  try {
    sessionStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch {
    // Storage can be blocked (private mode). The dashboard will ask again.
  }
}

export function readAdminPin(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_PIN_KEY);
  } catch {
    return null;
  }
}

const CREW_BOAT_KEY = 'kayal.crewBoat';

export function rememberCrewBoat(id: string) {
  try {
    localStorage.setItem(CREW_BOAT_KEY, id);
  } catch {
    // Not important enough to report.
  }
}

export function lastCrewBoat(): string {
  try {
    return localStorage.getItem(CREW_BOAT_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The old screens are plain HTML pages, so leave the React app with a full page load. */
export function goTo(href: string) {
  window.location.assign(href);
}

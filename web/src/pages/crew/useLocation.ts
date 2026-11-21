import { useCallback, useEffect, useRef, useState } from 'react';

export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
}

export type LocationState =
  | { status: 'idle' | 'finding'; position: null }
  | { status: 'ready'; position: Position }
  | { status: 'denied' | 'unavailable'; position: null };

/** Set after the first fix, for browsers without the Permissions API. Cleared on denial. */
const GRANTED_KEY = 'kayal.locationGranted';

function remember(granted: boolean) {
  try {
    if (granted) localStorage.setItem(GRANTED_KEY, '1');
    else localStorage.removeItem(GRANTED_KEY);
  } catch {
    // Private mode: the next visit asks again.
  }
}

function remembered() {
  try {
    return localStorage.getItem(GRANTED_KEY) === '1';
  } catch {
    return false;
  }
}

const IDLE: LocationState = { status: 'idle', position: null };
const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 };

/**
 * The phone's position. It starts idle so the permission prompt never appears before the crew
 * does anything: call `start()` from a tap. A visit after permission was granted starts watching
 * at once. `waitForFix` gives a send a few seconds for the first fix, since GPS can be slow.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? IDLE : { status: 'unavailable', position: null },
  );
  const current = useRef(state);
  const watch = useRef<number | null>(null);
  const waiters = useRef(new Set<(p: Position | null) => void>());

  const apply = useCallback((next: LocationState) => {
    current.current = next;
    setState(next);
    if (next.status === 'idle' || next.status === 'finding') return;
    for (const done of [...waiters.current]) done(next.position);
  }, []);

  const stop = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);

  /** Starts watching, or tries again after a failure. Call it inside a tap so the prompt has a reason. */
  const start = useCallback(() => {
    if (!navigator.geolocation) return apply({ status: 'unavailable', position: null });
    const s = current.current.status;
    if (watch.current !== null && (s === 'finding' || s === 'ready')) return;
    stop();
    if (s !== 'ready') apply({ status: 'finding', position: null });
    watch.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        remember(true);
        apply({ status: 'ready', position: { lat: coords.latitude, lon: coords.longitude, accuracy: Math.round(coords.accuracy) } });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          remember(false);
          stop();
          apply({ status: 'denied', position: null });
        } else if (current.current.status !== 'ready') {
          // The watch keeps trying; a later fix still lands.
          apply({ status: 'unavailable', position: null });
        }
      },
      OPTIONS,
    );
  }, [apply, stop]);

  // Start straight away when this site already has permission. Ask nothing otherwise.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let live = true;
    let status: PermissionStatus | null = null;
    const follow = () => {
      if (!live || !status) return;
      if (status.state === 'granted') start();
      else if (status.state === 'denied') {
        stop();
        remember(false);
        apply({ status: 'denied', position: null });
      }
    };
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((s) => {
          status = s;
          follow();
          s.addEventListener('change', follow);
        })
        .catch(() => live && remembered() && start());
    } else if (remembered()) {
      start();
    }
    return () => {
      live = false;
      status?.removeEventListener('change', follow);
      stop();
    };
  }, [apply, start, stop]);

  /**
   * The current fix, or the first one to arrive within `ms`. Resolves null at once when location
   * is idle, off or failing. `onWait` runs only when it does wait.
   */
  const waitForFix = useCallback((ms: number, onWait?: () => void): Promise<Position | null> => {
    const s = current.current;
    if (s.status === 'ready') return Promise.resolve(s.position);
    if (s.status !== 'finding') return Promise.resolve(null);
    onWait?.();
    return new Promise((resolve) => {
      const done = (p: Position | null) => {
        window.clearTimeout(timer);
        waiters.current.delete(done);
        resolve(p);
      };
      const timer = window.setTimeout(() => done(null), ms);
      waiters.current.add(done);
    });
  }, []);

  return { ...state, start, retry: start, waitForFix };
}

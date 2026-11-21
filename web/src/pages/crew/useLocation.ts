import { useCallback, useEffect, useState } from 'react';

export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
}

export type LocationState =
  | { status: 'finding'; position: null }
  | { status: 'ready'; position: Position }
  | { status: 'denied' | 'unavailable'; position: null };

/** Watches the phone's position for as long as the page is open. */
export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: 'finding', position: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ status: 'unavailable', position: null });
      return;
    }
    setState((s) => (s.status === 'ready' ? s : { status: 'finding', position: null }));
    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({ status: 'ready', position: { lat: coords.latitude, lon: coords.longitude, accuracy: Math.round(coords.accuracy) } }),
      (err) =>
        setState((s) =>
          err.code === err.PERMISSION_DENIED
            ? { status: 'denied', position: null }
            : s.status === 'ready'
              ? s
              : { status: 'unavailable', position: null },
        ),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

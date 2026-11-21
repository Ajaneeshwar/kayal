import { useCallback, useEffect, useState } from 'react';
import { fetchBoats, type Boat } from './api.ts';

export type BoatsState =
  | { status: 'loading'; boats: Boat[] }
  | { status: 'ready'; boats: Boat[] }
  | { status: 'error'; boats: Boat[] };

export function useBoats() {
  const [state, setState] = useState<BoatsState>({ status: 'loading', boats: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ status: 'loading', boats: s.boats }));
    fetchBoats(controller.signal)
      .then((boats) => setState({ status: 'ready', boats }))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setState((s) => ({ status: 'error', boats: s.boats }));
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

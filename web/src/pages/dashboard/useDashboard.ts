import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { fetchState, reportsOf, type Report, type State } from './api.ts';

export type Link = 'connecting' | 'live' | 'polling';

const FRESH_MS = 8000;
const POLL_MS = 5000;
/** Polling pauses only while events keep arriving. A quiet stream may be a dead one. */
const QUIET_MS = 20_000;
const EVENTS = ['entry', 'correction', 'facility', 'boat', 'report'] as const;

/**
 * Loads /api/state and the tourist reports, then keeps them current. The events route pushes a
 * nudge and we refetch. A proxy or tunnel can hold the stream open and never pass a byte, so the
 * badge turns live only after a real event, and /api/state is polled every 5 s whenever no event
 * has come in the last 20 s. Polling skips hidden tabs.
 * `fresh` holds the ids of entries that arrived since the page loaded, for a few seconds.
 */
export function useDashboard() {
  const [state, setStoredState] = useState<State | null>(null);
  // The last response as text. A poll that brings back the same data skips the re-render, which
  // on a phone redraws the map, the table and the feed every 5 s for nothing.
  const lastJson = useRef('');
  const setState = useCallback((next: SetStateAction<State | null>) => {
    lastJson.current = '';
    setStoredState(next);
  }, []);
  const [reports, setReports] = useState<Report[] | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<Link>('connecting');
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const known = useRef<Set<string> | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchState();
      const json = JSON.stringify(next);
      if (json === lastJson.current) {
        setError(null);
        return;
      }
      const ids = new Set(next.entries.map((e) => e.id));
      if (known.current) {
        const added = next.entries.filter((e) => !known.current!.has(e.id)).map((e) => e.id);
        if (added.length) {
          setFresh((prev) => new Set([...prev, ...added]));
          window.setTimeout(() => {
            setFresh((prev) => {
              const left = new Set(prev);
              added.forEach((id) => left.delete(id));
              return left;
            });
          }, FRESH_MS);
        }
      }
      known.current = ids;
      lastJson.current = json;
      setStoredState(next);
      setReports(reportsOf(next));
      setError(null);
      setLink((l) => (l === 'connecting' ? 'polling' : l));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // One fetch at a time. A call that lands mid-fetch runs once more afterwards, so an event is never lost.
  const refresh = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      do {
        again.current = false;
        await load();
      } while (again.current);
    } finally {
      inFlight.current = false;
    }
  }, [load]);

  // Coalesce bursts of events into one fetch.
  const timer = useRef<number | undefined>(undefined);
  const nudge = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(refresh, 120);
  }, [refresh]);

  useEffect(() => {
    refresh();
    let source: EventSource | null = null;
    let retry: number | undefined;
    let lastEventAt = 0;

    const onEvent = () => {
      lastEventAt = Date.now();
      setLink('live');
      nudge();
    };

    const connect = () => {
      if (typeof EventSource === 'undefined') return;
      source = new EventSource('/api/events');
      // Headers alone fire onopen, so it fetches state but does not mark the stream live.
      source.onopen = nudge;
      source.onmessage = onEvent;
      for (const name of EVENTS) source.addEventListener(name, onEvent);
      source.onerror = () => {
        lastEventAt = 0;
        setLink((l) => (l === 'connecting' ? l : 'polling'));
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          retry = window.setTimeout(connect, 15_000);
        }
      };
    };
    connect();

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastEventAt < QUIET_MS) return;
      refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      source?.close();
      window.clearTimeout(retry);
      window.clearInterval(poll);
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, nudge]);

  return { state, setState, reports, setReports, error, link, fresh, refresh };
}

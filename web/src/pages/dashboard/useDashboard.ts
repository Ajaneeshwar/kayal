import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchState, reportsOf, type Report, type State } from './api.ts';

export type Link = 'connecting' | 'live' | 'polling';

const FRESH_MS = 8000;
const POLL_MS = 5000;
const SAFETY_POLL_MS = 30_000;

/**
 * Loads /api/state and the tourist reports, then keeps them current: the events route pushes a
 * nudge and we refetch, and polling takes over whenever the event stream is down.
 * `fresh` holds the ids of entries that arrived since the page loaded, for a few seconds.
 */
export function useDashboard() {
  const [state, setState] = useState<State | null>(null);
  const [reports, setReports] = useState<Report[] | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<Link>('connecting');
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const known = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState();
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
      setState(next);
      setReports(reportsOf(next));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

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
    let current: Link = 'connecting';
    const setMode = (m: Link) => {
      current = m;
      setLink(m);
    };

    const connect = () => {
      if (typeof EventSource === 'undefined') return setMode('polling');
      source = new EventSource('/api/events');
      source.onopen = () => {
        setMode('live');
        nudge();
      };
      source.onmessage = nudge;
      for (const name of ['entry', 'correction', 'facility', 'boat', 'report']) {
        source.addEventListener(name, nudge);
      }
      source.onerror = () => {
        setMode('polling');
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          retry = window.setTimeout(connect, 15_000);
        }
      };
    };
    connect();

    const poll = window.setInterval(() => {
      if (current !== 'live' || Date.now() % SAFETY_POLL_MS < POLL_MS) refresh();
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

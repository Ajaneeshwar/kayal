import { useEffect, useRef } from 'react';

/**
 * Runs `fn` when the browser shows this page again from its back/forward cache, for example
 * after Back from /operator. The page comes back exactly as it was left, so a sign-in button that
 * was spinning while the next page loaded would keep spinning and refuse new taps.
 */
export function usePageRestore(fn: () => void) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) latest.current();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
}

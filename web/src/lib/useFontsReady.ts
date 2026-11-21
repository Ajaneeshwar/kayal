import { useEffect, useState } from 'react';

/**
 * True once the bundled fonts have loaded, or after `timeoutMs`. Entrance animations wait for
 * it, so text never swaps face while it is visible.
 */
export function useFontsReady(timeoutMs = 700) {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !('fonts' in document));
  useEffect(() => {
    if (ready) return;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, timeoutMs);
    document.fonts.ready.then(finish, finish);
    return () => window.clearTimeout(timer);
  }, [ready, timeoutMs]);
  return ready;
}

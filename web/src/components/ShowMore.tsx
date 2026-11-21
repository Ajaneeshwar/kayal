import { useState } from 'react';
import { t } from '../i18n/index.ts';
import { Bi } from './Bi.tsx';
import { Button } from './Button.tsx';

/** How many entries a list shows at first, and how many each "Show more" press adds. */
export const PAGE = 10;

/**
 * The first `PAGE` items, and a way to show more. Long logs render only what a phone needs on
 * screen, so a busy boat or the dashboard feed stays quick to open and scroll.
 */
export function usePaged<T>(items: readonly T[], step = PAGE) {
  const [limit, setLimit] = useState(step);
  return {
    shown: items.slice(0, limit),
    hidden: Math.max(0, items.length - limit),
    more: () => setLimit((n) => n + step),
  };
}

/** "Show 10 more", or fewer when fewer are left. Renders nothing when the list is complete. */
export function ShowMore({ hidden, onMore, step = PAGE, className = '' }: { hidden: number; onMore: () => void; step?: number; className?: string }) {
  if (hidden <= 0) return null;
  const count = String(Math.min(hidden, step));
  const text = t('showMore');
  return (
    <Button variant="secondary" block onClick={onMore} className={className}>
      <Bi text={{ en: text.en.replace('{count}', count), ml: text.ml.replace('{count}', count) }} />
    </Button>
  );
}

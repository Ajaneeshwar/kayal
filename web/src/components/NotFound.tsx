import { AppShell } from './AppShell.tsx';
import { Card } from './Card.tsx';
import { Bi } from './Bi.tsx';

export function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-4 pt-24">
        <Card className="p-8 text-center">
          <Bi k="pageMissing" as="h1" className="font-display text-title font-semibold" />
          <Bi k="chooseDoorHelp" as="p" className="mt-2 text-ink-muted" />
          <a href="/" className="mt-6 inline-flex min-h-12 items-center rounded-control bg-gold px-5 font-semibold text-teak">
            <Bi k="goHome" />
          </a>
        </Card>
      </div>
    </AppShell>
  );
}

import { AppShell } from './AppShell.tsx';
import { Card } from './Card.tsx';

export function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-4 pt-24">
        <Card className="p-8 text-center">
          <h1 className="font-display text-title font-semibold">This page does not exist</h1>
          <p className="mt-2 text-ink-muted">Go back to the start and choose a door.</p>
          <a href="/" className="mt-6 inline-flex min-h-12 items-center rounded-control bg-gold px-5 font-semibold text-teak">
            Go to the start
          </a>
        </Card>
      </div>
    </AppShell>
  );
}

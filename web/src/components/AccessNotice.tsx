import { AppShell } from './AppShell.tsx';
import { Bi } from './Bi.tsx';
import { Card } from './Card.tsx';

export function AccessNotice({ role }: { role: 'crew' | 'inspector' }) {
  return (
    <AppShell>
      <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-4 pt-24">
        <Card className="p-8 text-center">
          <Bi k={role === 'crew' ? 'pickBoatFirst' : 'inspectorFirst'} as="h1" className="font-display text-title font-semibold text-ink" />
          <a href="/#doors" className="mt-6 inline-flex min-h-12 items-center rounded-control bg-gold px-5 font-semibold text-teak">
            <Bi k="signinTitle" />
          </a>
        </Card>
      </div>
    </AppShell>
  );
}

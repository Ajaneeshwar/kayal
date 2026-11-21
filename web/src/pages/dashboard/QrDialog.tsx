import { publicOrigin } from '../../lib/publicOrigin.ts';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { QrFigure } from '../../components/QrFigure.tsx';
import type { Boat } from './api.ts';
import { Dialog } from './Dialog.tsx';
import { d } from './i18n.ts';
import { bt } from '../boat/data.ts';

/** The notes stay English on the dashboard, as before. */
const note = (en: string) => ({ en, ml: '' });

export function QrDialog({ boat, publicUrl, onClose }: { boat: Boat; publicUrl?: string | null; onClose: () => void }) {
  const origin = publicOrigin(publicUrl);
  const crew = `${origin}/crew?boat=${encodeURIComponent(boat.id)}`;
  const record = `${origin}/boat/${encodeURIComponent(boat.id)}`;
  return (
    <Dialog title={d('qrCodes')} subtitle={`${boat.name} · ${boat.registration}`} onClose={onClose} className="kl-print" width="max-w-2xl">
      <p className="kl-print-only mb-4 font-display text-title font-semibold">
        {boat.name} <span className="text-lead font-normal text-ink-muted">{boat.registration}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <QrFigure url={crew} label={d('crewLink')} note={note('For the crew. Keep it inside the cabin.')} />
        <QrFigure url={record} label={d('publicRecord')} note={note('For guests. Put it where they board.')} />
      </div>
      <div className="kl-no-print mt-6 flex justify-end gap-3">
        <a href={`/boat/${encodeURIComponent(boat.id)}/sticker`} className="min-h-11 content-center font-semibold text-gold-ink underline"><Bi text={bt('sticker')} /></a>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
    </Dialog>
  );
}

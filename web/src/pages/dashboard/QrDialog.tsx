import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import type { Boat } from './api.ts';
import { Dialog } from './Dialog.tsx';
import { d } from './i18n.ts';

const INK = '#0b2737'; // --color-ink
const PAPER = '#fefdf8'; // --color-kasavu

function useQrSvg(url: string) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: INK, light: PAPER } }).then(setSvg, () => setSvg(''));
  }, [url]);
  return svg;
}

function Code({ url, label, note }: { url: string; label: ReturnType<typeof d>; note: string }) {
  const svg = useQrSvg(url);
  return (
    <figure className="kl-qr flex flex-col items-center rounded-control border border-line bg-kasavu p-4 text-center">
      {/* The SVG comes from the qrcode package, not from user input. */}
      <div className="aspect-square w-full max-w-[13rem]" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="mt-3">
        <Bi text={label} className="font-display text-lead font-semibold" />
        <span className="mt-1 block text-caption text-ink-muted">{note}</span>
        <a href={url} className="mt-2 block break-all text-caption text-gold-ink underline decoration-gold-ink/40 underline-offset-2">
          {url}
        </a>
      </figcaption>
    </figure>
  );
}

export function QrDialog({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const origin = window.location.origin;
  const crew = `${origin}/crew?boat=${encodeURIComponent(boat.id)}`;
  const record = `${origin}/boat/${encodeURIComponent(boat.id)}`;
  return (
    <Dialog title={d('qrCodes')} subtitle={`${boat.name} · ${boat.registration}`} onClose={onClose} className="kl-print" width="max-w-2xl">
      <p className="kl-print-only mb-4 font-display text-title font-semibold">
        {boat.name} <span className="text-lead font-normal text-ink-muted">{boat.registration}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Code url={crew} label={d('crewLink')} note="For the crew. Keep it inside the cabin." />
        <Code url={record} label={d('publicRecord')} note="For guests. Put it where they board." />
      </div>
      <div className="kl-no-print mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
    </Dialog>
  );
}

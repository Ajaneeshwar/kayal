import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Text } from '../i18n/index.ts';
import { Bi } from './Bi.tsx';

const INK = '#0b2737'; // --color-ink
const PAPER = '#fefdf8'; // --color-kasavu

function useQrSvg(url: string) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: INK, light: PAPER } }).then(setSvg, () => setSvg(''));
  }, [url]);
  return svg;
}

/** A QR code for `url`, with its label, a short note and the link written out. */
export function QrFigure({ url, label, note }: { url: string; label: Text; note: Text }) {
  const svg = useQrSvg(url);
  return (
    <figure className="kl-qr flex flex-col items-center rounded-control border border-line bg-kasavu p-4 text-center">
      {/* The SVG comes from the qrcode package, not from user input. */}
      <div className="aspect-square w-full max-w-[13rem]" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="mt-3">
        <Bi text={label} className="font-display text-lead font-semibold" />
        <Bi text={note} className="mt-1 block text-caption text-ink-muted" />
        <a href={url} className="mt-2 block break-all text-caption text-gold-ink underline decoration-gold-ink/40 underline-offset-2">
          {url}
        </a>
      </figcaption>
    </figure>
  );
}

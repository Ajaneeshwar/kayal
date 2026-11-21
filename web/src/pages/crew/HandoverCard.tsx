import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { publicOrigin } from '../../lib/publicOrigin.ts';
import { StampIcon } from '../../components/StatusBadge.tsx';
import { usePick } from '../../i18n/language.ts';
import type { Entry } from './api.ts';
import { t } from './i18n.ts';
import { MlEn } from './ui.tsx';

// The QR SVG takes literal colours: --color-ink on --color-kasavu, as on the dashboard's QR codes.
const INK = '#0b2737';
const PAPER = '#fefdf8';

function useQrSvg(url: string) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: INK, light: PAPER } }).then(
      (s) => live && setSvg(s),
      () => live && setSvg(''),
    );
    return () => {
      live = false;
    };
  }, [url]);
  return svg;
}

/**
 * After a save: the handover code and a QR link for the plant, truck or collector, who confirms
 * the handover on /operator. The crew turns the phone round, so the code is large and spaced.
 */
export function HandoverCard({ entry, publicUrl }: { publicUrl?: string | null; entry: Entry & { handoverCode: string } }) {
  const pick = usePick();
  const code = entry.handoverCode.toUpperCase();
  const svg = useQrSvg(`${publicOrigin(publicUrl)}/operator?entry=${encodeURIComponent(entry.id)}`);

  return (
    <section
      aria-label={pick(t('handoverTitle'))}
      className="surface-light relative rounded-card border border-gold-edge/70 bg-kasavu p-5 text-ink shadow-[var(--shadow-card)]"
    >
      <MlEn as="h2" text={t('handoverTitle')} className="font-semibold" mlClassName="text-body" enClassName="!text-small" />

      <MlEn text={t('handoverCode')} className="mt-3 text-caption text-ink-muted" mlClassName="text-small" />
      <p className="mt-1.5 flex">
        <span className="sr-only">{code.split('').join(' ')}</span>
        {code.split('').map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            // Two groups of three read aloud and type more easily than six in a row.
            className={`grid h-14 w-10 place-items-center rounded-control bg-surface font-sans text-[1.75rem] font-semibold leading-none tabular-nums text-ink ring-1 ring-line ${
              i === 0 ? '' : i === 3 ? 'ms-3.5' : 'ms-1.5'
            }`}
          >
            {c}
          </span>
        ))}
      </p>

      {/* QR beside the line, so the whole card fits above the recording controls on a 360 px phone. */}
      <div className="mt-4 flex items-start gap-4">
        <div
          role="img"
          aria-label={pick(t('handoverQr'))}
          className="aspect-square w-28 shrink-0 overflow-hidden rounded-control bg-kasavu ring-1 ring-line [&>svg]:size-full"
          // The SVG comes from the qrcode package, built from the entry ID, not from user input.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <StampIcon size={20} className="text-confirmed" />
          <MlEn text={t('handoverBody')} className="mt-1.5 text-small text-ink" mlClassName="text-small" enClassName="!text-caption" />
        </div>
      </div>
    </section>
  );
}

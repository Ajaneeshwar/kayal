import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import QRCode from 'qrcode';
import { publicOrigin } from '../../lib/publicOrigin.ts';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { usePick } from '../../i18n/language.ts';
import { bt, fetchBoat, type BoatRecord } from './data.ts';
import { Seal } from './Seal.tsx';
import './sticker.css';

export default function StickerPage() {
  const { boatId = '' } = useParams();
  const pick = usePick();
  const [record, setRecord] = useState<{ boat: BoatRecord; svg: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setFailed(false);
    fetchBoat(boatId, controller.signal).then(async ({ boat, publicUrl }) => {
      const url = `${publicOrigin(publicUrl)}/boat/${encodeURIComponent(boatId)}`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' });
      if (!controller.signal.aborted) setRecord({ boat, svg, url });
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [boatId, attempt]);
  return (
    <main className="sticker-page surface-light grid min-h-svh place-content-center gap-6 bg-surface p-4 text-ink">
      {!record ? (
        <div className="max-w-sm text-center" role={failed ? 'alert' : 'status'}>
          <Bi text={bt(failed ? 'stickerError' : 'stickerLoading')} />
          {failed && <Button className="mt-4" onClick={() => setAttempt((n) => n + 1)}><Bi text={bt('retrySticker')} /></Button>}
        </div>
      ) : (
        <>
          <article className="boat-sticker mx-auto flex w-full max-w-[90mm] flex-col items-center rounded-card border border-ink bg-kasavu p-5 text-center">
            <Seal state={record.boat.status.state} stamp={false} className="size-20" />
            <h1 className="mt-3 break-words font-display text-heading font-semibold">{record.boat.name}</h1>
            <p className="mt-1 break-all text-small">{record.boat.registration}</p>
            <div className="mt-2"><StatusBadge state={record.boat.status.state} bilingual={false} /></div>
            <div role="img" aria-label={pick(bt('stickerScan'))} className="sticker-code mt-3 aspect-square w-full max-w-[52mm]" dangerouslySetInnerHTML={{ __html: record.svg }} />
            <Bi as="p" text={bt('stickerScan')} className="mt-2 font-semibold" />
            <a href={record.url} className="mt-2 break-all text-caption underline">{record.url}</a>
          </article>
          <Button className="sticker-tools mx-auto" onClick={() => window.print()}><Bi text={bt('print')} /></Button>
        </>
      )}
    </main>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Bi } from '../../components/Bi.tsx';
import { QrFigure } from '../../components/QrFigure.tsx';
import { usePick } from '../../i18n/language.ts';
import { publicOrigin } from '../../lib/publicOrigin.ts';
import { bt } from '../boat/data.ts';
import { t } from './i18n.ts';

/** The public link from the server, so a QR made on the laptop still opens on a guest's phone. */
function usePublicUrl() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { publicUrl?: string | null } | null) => setUrl(body?.publicUrl ?? null), () => {});
    return () => controller.abort();
  }, []);
  return url;
}

/** The boat's two QR codes, the same ones the inspector prints from the dashboard. */
export function QrCodes({ boatId, boatName, onClose }: { boatId: string; boatName: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pick = usePick();
  const origin = publicOrigin(usePublicUrl());
  const id = encodeURIComponent(boatId);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} className="surface-light m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-card border border-gold-edge bg-kasavu p-4 text-ink shadow-raised backdrop:bg-teak-deep/70 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Bi id={titleId} as="h2" text={t('qrTitle')} className="font-display text-heading font-semibold" />
          <p className="mt-1 text-small text-ink-muted [overflow-wrap:anywhere]">{boatName}</p>
        </div>
        <button type="button" aria-label={pick(t('qrClose'))} onClick={onClose} className="min-h-11 shrink-0 rounded-control px-3 text-small font-semibold underline"><Bi text={t('qrClose')} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <QrFigure url={`${origin}/crew?boat=${id}`} label={t('qrCrew')} note={t('qrCrewNote')} />
        <QrFigure url={`${origin}/boat/${id}`} label={t('qrGuest')} note={t('qrGuestNote')} />
      </div>
      <a href={`/boat/${id}/sticker`} className="mt-4 flex min-h-11 items-center justify-center rounded-control bg-gold px-4 font-semibold text-teak">
        <Bi text={bt('sticker')} />
      </a>
    </dialog>
  );
}

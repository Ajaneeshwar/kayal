import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Boat, Heard, Reply } from './api.ts';
import { t } from './i18n.ts';
import type { CrewKey } from './strings.ts';
import { BoatMark, Icon, MlEn, SpokenPair } from './ui.tsx';

const enter = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const },
};

function Avatar() {
  return (
    <span aria-hidden="true" className="mt-5 grid size-8 shrink-0 place-items-center rounded-full bg-teak-raised ring-1 ring-gold-edge/40">
      <BoatMark className="h-3 w-auto text-gold" />
    </span>
  );
}

function Who({ k, align = 'start' }: { k: CrewKey; align?: 'start' | 'end' }) {
  return (
    <MlEn
      text={t(k)}
      layout="inline"
      className={`mb-1 text-caption text-ink-inverse-muted ${align === 'end' ? 'justify-end' : ''}`}
      mlClassName="text-caption"
    />
  );
}

/** Kayal Log's side of the exchange: a kasavu-cream bubble on the left. */
export function KayalBubble({ children, label = true }: { children: ReactNode; label?: boolean }) {
  return (
    <motion.div {...enter} className="flex items-start gap-2 pe-3">
      <Avatar />
      <div className="min-w-0 flex-1">
        {label && <Who k="replyFrom" />}
        <div className="surface-light rounded-card rounded-ss-md bg-kasavu px-4 py-3 text-ink shadow-[var(--shadow-card)]">{children}</div>
      </div>
    </motion.div>
  );
}

/** The crew's side: warm wood, on the right. */
export function CrewBubble({ children, photoUrl }: { children: ReactNode; photoUrl?: string }) {
  return (
    <motion.div {...enter} className="flex flex-col items-end ps-8">
      <Who k="you" align="end" />
      <div className="max-w-full rounded-card rounded-se-md bg-wood px-4 py-3 text-ink-inverse shadow-[var(--shadow-card)]">
        {photoUrl && (
          <img src={photoUrl} alt="" className="mb-2 h-28 w-auto max-w-full rounded-control object-cover outline outline-1 -outline-offset-1 outline-white/10" />
        )}
        {children}
      </div>
    </motion.div>
  );
}

export function Intro({ boat }: { boat: Boat }) {
  const last = boat.status.lastSewage;
  const ago = last ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-last.daysAgo, 'day') : null;
  return (
    <KayalBubble>
      <MlEn text={t('introTitle')} className="font-semibold" mlClassName="text-body" enClassName="!text-small font-normal" />
      <div className="mt-3 border-s-2 border-gold-edge ps-3">
        <MlEn text={t('forExample')} layout="inline" className="text-caption text-ink-muted" mlClassName="text-caption" />
        <MlEn text={t('introExample')} className="mt-0.5" mlClassName="text-body" enClassName="!text-small text-ink-muted !opacity-100" />
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-small">
        <MlEn text={t('lastSewage')} layout="inline" className="text-ink-muted" mlClassName="text-small" />
        <span className="font-semibold tabular-nums">
          {last && ago ? `${ago}${last.facilityName ? ` · ${last.facilityName}` : ''}` : t('notYet').en}
        </span>
      </div>
    </KayalBubble>
  );
}

export function HeardBubble({ heard, photoUrl }: { heard: Heard; photoUrl?: string }) {
  return (
    <CrewBubble photoUrl={photoUrl}>
      <SpokenPair original={heard.original} english={heard.english} language={heard.language} />
    </CrewBubble>
  );
}

/** Shown while a recording is on its way, before the words come back. */
export function VoiceNoteBubble({ seconds, photoUrl }: { seconds: number; photoUrl?: string }) {
  const heights = [0.35, 0.7, 0.5, 0.9, 0.6, 1, 0.45, 0.8, 0.55, 0.7, 0.4, 0.85, 0.5, 0.3];
  return (
    <CrewBubble photoUrl={photoUrl}>
      <div className="flex items-center gap-3">
        <Icon.Mic size={18} className="text-gold-bright" />
        <span aria-hidden="true" className="flex h-6 items-center gap-[3px]">
          {heights.map((h, i) => (
            <span key={i} className="w-[3px] rounded-pill bg-ink-inverse/70" style={{ height: `${h * 100}%` }} />
          ))}
        </span>
        <span className="text-small tabular-nums text-ink-inverse-muted">0:{String(seconds).padStart(2, '0')}</span>
      </div>
    </CrewBubble>
  );
}

export function TypedBubble({ text, photoUrl }: { text: string; photoUrl?: string }) {
  return (
    <CrewBubble photoUrl={photoUrl}>
      <p className="text-lead">{text}</p>
    </CrewBubble>
  );
}

export function ReplyBubble({ reply, speaking, onPlay }: { reply: Reply; speaking: boolean; onPlay: () => void }) {
  return (
    <KayalBubble>
      <SpokenPair original={reply.local} english={reply.english} language={reply.language} />
      <button
        type="button"
        onClick={onPlay}
        className="-ms-2 mt-2 inline-flex min-h-11 items-center gap-2 rounded-pill px-2.5 text-small font-semibold text-gold-ink
          transition-[scale,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.96] hover:bg-surface"
      >
        <Icon.Speaker size={18} />
        {speaking ? (
          <span className="inline-flex items-center gap-2">
            <MlEn text={t('speaking')} layout="inline" />
            <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-[3px] animate-pulse rounded-pill bg-current" style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
          </span>
        ) : (
          <MlEn text={t('playAgain')} layout="inline" />
        )}
      </button>
    </KayalBubble>
  );
}

export function Thinking() {
  return (
    <KayalBubble label={false}>
      <span className="flex h-6 items-center gap-1.5" aria-label={t('stateSending').en}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-pulse rounded-full bg-gold-edge" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </span>
    </KayalBubble>
  );
}

export type NoticeKind = 'photo' | 'micDenied' | 'micMissing' | 'locDenied' | 'offline' | 'notUnderstood' | 'unusable' | 'service' | 'server';

const NOTICE: Record<NoticeKind, { title: CrewKey; body?: CrewKey; icon: typeof Icon.Alert }> = {
  photo: { title: 'photoFailTitle', body: 'photoFailBody', icon: Icon.Camera },
  micDenied: { title: 'micDeniedTitle', body: 'micDeniedBody', icon: Icon.Mic },
  micMissing: { title: 'micMissingTitle', body: 'micMissingBody', icon: Icon.Mic },
  locDenied: { title: 'locDeniedTitle', body: 'locDeniedBody', icon: Icon.PinOff },
  offline: { title: 'offlineTitle', body: 'offlineBody', icon: Icon.WifiOff },
  notUnderstood: { title: 'notUnderstoodTitle', body: 'notUnderstoodBody', icon: Icon.Alert },
  unusable: { title: 'unusableTitle', icon: Icon.Alert },
  service: { title: 'serviceTitle', body: 'serviceBody', icon: Icon.Alert },
  server: { title: 'serverTitle', icon: Icon.Alert },
};

/** A failure, said plainly, with what to do next. */
export function Notice({
  kind,
  detail,
  actions,
  onDismiss,
  compact = false,
}: {
  kind: NoticeKind;
  detail?: string;
  actions?: ReactNode;
  onDismiss?: () => void;
  compact?: boolean;
}) {
  const n = NOTICE[kind];
  const Glyph = n.icon;
  return (
    <motion.div
      {...enter}
      role="alert"
      className={`flex items-start gap-3 rounded-card border border-gold-edge/35 bg-teak-raised text-ink-inverse ${compact ? 'p-3' : 'p-4'}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
        <Glyph size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <MlEn text={t(n.title)} className="font-semibold" mlClassName="text-body" enClassName="!text-small font-normal" />
        {n.body && <MlEn text={t(n.body)} className="mt-1.5 text-small text-ink-inverse-muted" mlClassName="text-small" />}
        {detail && (
          <p lang="en" className="mt-1.5 text-small text-ink-inverse-muted">
            {detail}
          </p>
        )}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('dismiss').en}
          className="-me-1.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-inverse-muted hover:bg-teak active:scale-[0.96]"
        >
          <Icon.Close size={18} />
        </button>
      )}
    </motion.div>
  );
}

/** A small action inside a notice. */
export function NoticeAction({ k, onClick, primary = false }: { k: CrewKey; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-control px-4 text-small font-semibold transition-[scale,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.96] ${
        primary ? 'bg-gold text-teak shadow-[var(--shadow-button)] hover:bg-gold-bright' : 'border border-ink-inverse/30 text-ink-inverse hover:border-ink-inverse/60'
      }`}
    >
      <MlEn text={t(k)} layout="inline" mlClassName="text-small" />
    </button>
  );
}

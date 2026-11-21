import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePick } from '../../i18n/language.ts';
import { KayalBubble } from './Conversation.tsx';
import { t } from './i18n.ts';
import type { CrewKey } from './strings.ts';
import { MlEn } from './ui.tsx';

/**
 * Where a send is. `locating` waits for a first GPS fix, `uploading` lasts until the request body
 * has left the phone, and `processing` covers the server's work, which reports no progress.
 */
export interface SendStage {
  phase: 'locating' | 'uploading' | 'processing';
  /** When this phase began. */
  since: number;
  /** When the send began. */
  started: number;
}

/** After this long, a line says a slow connection can take a while. */
const SLOW_MS = 15_000;

/**
 * The server's steps, timed from the end of the upload. They are estimates: speech to text,
 * then the place and receipt checks, then the reply. The last step holds until the answer comes.
 */
function serverStep(input: 'voice' | 'text', photo: boolean, seconds: number): CrewKey {
  const check: CrewKey = photo ? 'stageCheckingPhoto' : 'stageChecking';
  if (input === 'voice') {
    if (seconds < 4) return 'stageListening';
    return seconds < (photo ? 10 : 7) ? check : 'stageReplying';
  }
  return seconds < (photo ? 5 : 2.5) ? check : 'stageReplying';
}

/** The Kayal Log bubble shown while an entry is on its way: the current step and a short step bar. */
export function SendProgress({ stage, input, photo }: { stage: SendStage; input: 'voice' | 'text'; photo: boolean }) {
  const pick = usePick();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const steps: CrewKey[] =
    input === 'voice'
      ? ['stageUploading', 'stageListening', photo ? 'stageCheckingPhoto' : 'stageChecking', 'stageReplying']
      : [photo ? 'stageUploading' : 'stateSending', photo ? 'stageCheckingPhoto' : 'stageChecking', 'stageReplying'];

  const label: CrewKey =
    stage.phase === 'locating'
      ? 'stageLocating'
      : stage.phase === 'uploading'
        ? steps[0]
        : serverStep(input, photo, (now - stage.since) / 1000);
  const index = stage.phase === 'locating' ? -1 : steps.indexOf(label);
  const slow = now - stage.started > SLOW_MS;
  // The slow-connection line grows the bubble after the last scroll, so bring it into view.
  const slowLine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (slow) slowLine.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [slow]);

  return (
    <KayalBubble label={false}>
      <div className="flex min-h-6 items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 animate-pulse rounded-full bg-gold-edge" style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </span>
        <span className="sr-only">{pick(t('stateSending'))}: </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className="min-w-0"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <MlEn text={t(label)} className="text-small font-semibold" mlClassName="text-small" />
          </motion.span>
        </AnimatePresence>
      </div>
      <ol aria-hidden="true" className="mt-3 flex gap-1.5">
        {steps.map((key, i) => (
          <li
            key={key}
            className={`h-1 flex-1 rounded-pill transition-colors duration-300 ${
              i < index ? 'bg-gold-ink' : i === index ? 'bg-gold-ink motion-safe:animate-pulse' : 'bg-line'
            }`}
          />
        ))}
      </ol>
      {slow && (
        <div ref={slowLine}>
          <MlEn text={t('stageSlow')} className="mt-2.5 text-caption text-ink-muted" mlClassName="text-caption" />
        </div>
      )}
    </KayalBubble>
  );
}

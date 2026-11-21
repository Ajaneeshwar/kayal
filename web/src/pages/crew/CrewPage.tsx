import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AccessNotice } from '../../components/AccessNotice.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageSwitch } from '../../components/LanguageSwitch.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { pick, useLang, usePick } from '../../i18n/language.ts';
import { rememberCrewBoat } from '../../lib/api.ts';
import {
  ApiError,
  blobToBase64,
  distanceM,
  formatDistance,
  getBoat,
  postLog,
  shrinkPhoto,
  silentWavUrl,
  speak,
  type Boat,
  type Entry,
  type Facility,
  type LogPayload,
  type LogResult,
} from './api.ts';
import { HeardBubble, Intro, Notice, NoticeAction, ReplyBubble, TypedBubble, VoiceNoteBubble, type NoticeKind } from './Conversation.tsx';
import { SendProgress, type SendStage } from './Progress.tsx';
import { t } from './i18n.ts';
import { Receipt } from './Receipt.tsx';
import { HandoverCard } from './HandoverCard.tsx';
import { methodOf } from '../../components/MethodIcon.tsx';
import { RecordButton, Wave, type MicState } from './RecordButton.tsx';
import type { CrewKey } from './strings.ts';
import { Icon, MlEn } from './ui.tsx';
import { useLocation } from './useLocation.ts';
import { useRecorder, type RecorderFailure } from './useRecorder.ts';
import { PastEntries } from './PastEntries.tsx';

const MAX_SECONDS = 25;
/** A first GPS fix can take several seconds. A send waits this long for one, then goes without it. */
const FIX_WAIT_MS = 8000;

interface Exchange {
  id: string;
  input: 'voice' | 'text';
  typed?: string;
  seconds?: number;
  photoUrl?: string;
  status: 'sending' | 'done' | 'failed';
  stage?: SendStage;
  hasPhoto?: boolean;
  result?: Partial<LogResult>;
  entry?: Entry;
  token?: string | null;
  notice?: { kind: NoticeKind; detail?: string; retry: boolean };
}

type Load = { status: 'loading' } | { status: 'ready'; boat: Boat; facilities: Facility[] } | { status: 'missing' } | { status: 'error' };

function classify(err: unknown): NonNullable<Exchange['notice']> {
  if (!(err instanceof ApiError)) return { kind: 'server', detail: (err as Error).message, retry: true };
  if (err.status === 0) return { kind: 'offline', retry: true };
  if (err.status === 422 && err.body?.reply) return { kind: 'notUnderstood', retry: false };
  if (err.status === 422) return { kind: 'unusable', detail: err.message, retry: false };
  if (err.status === 502 || err.status === 504 || err.status === 408) return { kind: 'service', retry: true };
  return { kind: 'server', detail: err.message, retry: err.status >= 500 };
}

const STATE_LABEL: Record<MicState, CrewKey> = {
  ready: 'stateReady',
  listening: 'stateListening',
  sending: 'stateSending',
  answered: 'stateAnswered',
};

export default function CrewPage() {
  const [params] = useSearchParams();
  const boatId = params.get('boat');
  if (!boatId) return <AccessNotice role="crew" />;
  return <Crew key={boatId} boatId={boatId} />;
}

function Crew({ boatId }: { boatId: string }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const lang = useLang();
  const [attempt, setAttempt] = useState(0);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pastOpen, setPastOpen] = useState(false);
  const [pastRevision, setPastRevision] = useState(0);
  const [mic, setMic] = useState<MicState>('ready');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [typed, setTyped] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; previewUrl: string } | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [micProblem, setMicProblem] = useState<'micDenied' | 'micMissing' | null>(null);
  const [locDismissed, setLocDismissed] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const location = useLocation();
  const { waitForFix } = location;
  const payloads = useRef(new Map<string, LogPayload>());
  const audio = useRef<HTMLAudioElement>(null);
  const silence = useMemo(() => silentWavUrl(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setLoad({ status: 'loading' });
    getBoat(boatId)
      .then(({ boat, facilities }) => {
        if (!live) return;
        setLoad({ status: 'ready', boat, facilities });
        rememberCrewBoat(boat.id);
      })
      .catch((err) => live && setLoad({ status: err instanceof ApiError && err.status === 404 ? 'missing' : 'error' }));
    return () => {
      live = false;
    };
  }, [boatId, attempt]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [exchanges]);

  const update = useCallback((id: string, patch: Partial<Exchange>) => {
    setExchanges((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  /** Plays the silent clip inside a tap, so the reply may play later without one. */
  const unlockAudio = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.src = silence;
    el.play().catch(() => {});
  }, [silence]);

  const playReply = useCallback(async (replyId: string) => {
    const el = audio.current;
    if (!el) return;
    setSpeakingId(replyId);
    try {
      const { audioBase64, mime } = await speak(replyId);
      el.src = `data:${mime};base64,${audioBase64}`;
      el.onended = () => setSpeakingId((id) => (id === replyId ? null : id));
      await el.play();
    } catch {
      // The reply stays on screen and "Play again" stays available.
      setSpeakingId((id) => (id === replyId ? null : id));
    }
  }, []);

  const send = useCallback(
    async (id: string) => {
      let payload = payloads.current.get(id);
      if (!payload) return;
      const started = Date.now();
      const stage = (phase: SendStage['phase']) => update(id, { stage: { phase, since: Date.now(), started } });
      update(id, { status: 'sending', notice: undefined, stage: { phase: 'uploading', since: started, started } });
      setMic('sending');
      // Without a fix yet, give the GPS a few seconds: a fix can raise the entry to Location proof.
      if (payload.lat === undefined) {
        const pos = await waitForFix(FIX_WAIT_MS, () => stage('locating'));
        if (pos) {
          payload = { ...payload, lat: pos.lat, lon: pos.lon, accuracy: pos.accuracy };
          payloads.current.set(id, payload);
        }
        stage('uploading');
      }
      try {
        // The reply follows the language the crew spoke, whatever the page language is.
        const result = await postLog({ ...payload, replyLanguage: 'auto' }, () => stage('processing'));
        update(id, { status: 'done', result, entry: result.entry, token: result.correctionToken ?? null });
        if (result.stored) {
          setPastRevision((n) => n + 1);
          setPhoto(null);
          payloads.current.delete(id);
          if (result.status) setLoad((l) => (l.status === 'ready' ? { ...l, boat: { ...l.boat, status: result.status! } } : l));
        }
        if (result.reply) playReply(result.reply.id);
        setMic('answered');
      } catch (err) {
        const notice = classify(err);
        const body = err instanceof ApiError ? err.body : null;
        update(id, { status: 'failed', notice, result: body?.reply ? { heard: body.heard, reply: body.reply } : undefined });
        if (body?.reply) playReply(body.reply.id);
        setMic('ready');
      }
    },
    [playReply, update, waitForFix],
  );

  const submit = useCallback(
    (input: Pick<LogPayload, 'text' | 'audioBase64' | 'audioMime'>, extra: Partial<Exchange>) => {
      const id = crypto.randomUUID();
      const pos = location.position;
      payloads.current.set(id, {
        boatId,
        ...input,
        ...(pos ? { lat: pos.lat, lon: pos.lon, accuracy: pos.accuracy } : {}),
        photoBase64: photo?.base64 ?? null,
      });
      setExchanges((list) => [...list, { id, status: 'sending', photoUrl: photo?.previewUrl, hasPhoto: Boolean(photo), input: 'voice', ...extra }]);
      send(id);
    },
    [boatId, location.position, photo, send],
  );

  const secondsLeftRef = useRef(MAX_SECONDS);
  const recorder = useRecorder({
    maxSeconds: MAX_SECONDS,
    onDone: async (blob) => {
      const seconds = Math.max(1, MAX_SECONDS - secondsLeftRef.current);
      submit({ audioBase64: await blobToBase64(blob), audioMime: blob.type || 'audio/webm' }, { input: 'voice', seconds });
    },
    onFail: (why: RecorderFailure) => {
      setMicProblem(why === 'denied' ? 'micDenied' : 'micMissing');
      setMic('ready');
    },
  });
  secondsLeftRef.current = recorder.secondsLeft;

  const micState: MicState = recorder.recording ? 'listening' : mic;

  async function pressRecord() {
    if (recorder.recording) {
      setMic('sending');
      recorder.stop();
      return;
    }
    if (mic === 'sending') return;
    unlockAudio();
    audio.current?.pause();
    setSpeakingId(null);
    setMicProblem(null);
    // Ask for location with the microphone, on the tap, so neither prompt comes out of nowhere.
    location.start();
    await recorder.start();
  }

  function sendTyped(e: FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text || mic === 'sending') return;
    unlockAudio();
    location.start();
    setTyped('');
    submit({ text }, { input: 'text', typed: text });
  }

  /** A receipt photo is taken at the handover, so it is a good moment to ask for location too. */
  function openCamera() {
    location.start();
    fileInput.current?.click();
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await shrinkPhoto(file));
      setPhotoFailed(false);
    } catch {
      setPhoto(null);
      setPhotoFailed(true);
    }
  }

  function switchToText() {
    setMode('text');
    setMicProblem(null);
    requestAnimationFrame(() => textArea.current?.focus());
  }

  if (load.status === 'loading') {
    return (
      <div className="grid h-dvh place-items-center bg-teak-deep">
        <span className="size-8 animate-spin rounded-full border-2 border-gold border-r-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (load.status !== 'ready') {
    const missing = load.status === 'missing';
    return (
      <div className="grid min-h-dvh place-items-center bg-teak-deep p-5 text-ink-inverse">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-teak-raised text-gold">
            {missing ? <Icon.Alert size={26} /> : <Icon.WifiOff size={26} />}
          </span>
          <MlEn text={t(missing ? 'boatMissingTitle' : 'loadFailTitle')} as="h1" className="font-display text-heading font-semibold" mlClassName="text-lead font-sans" enClassName="!text-body" />
          <MlEn text={t(missing ? 'boatMissingBody' : 'offlineBody')} className="text-small text-ink-inverse-muted" mlClassName="text-small" />
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {!missing && <NoticeAction k="tryAgain" primary onClick={() => setAttempt((n) => n + 1)} />}
            <Link
              to="/"
              className={`inline-flex min-h-11 items-center rounded-control px-4 text-small font-semibold active:scale-[0.96] ${
                missing ? 'bg-gold text-teak shadow-[var(--shadow-button)]' : 'border border-ink-inverse/30'
              }`}
            >
              <MlEn text={t('pickBoat')} layout="inline" mlClassName="text-small" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { boat, facilities } = load;
  const busy = micState === 'sending';

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[36rem] flex-col bg-teak-deep text-ink-inverse">
      <header className="relative z-10 bg-teak pt-[env(safe-area-inset-top)] shadow-[0_12px_32px_-18px_var(--color-teak-deep)]">
        <div className="mx-auto flex max-w-[36rem] items-start gap-1.5 px-2 pt-2">
          <Link
            to="/"
            aria-label={pick(t('back'), lang)}
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-inverse-muted transition-[scale,background-color] duration-[var(--duration-press)] hover:bg-teak-raised active:scale-[0.96]"
          >
            <Icon.Back size={22} />
          </Link>
          {/* The full name wraps rather than truncates; the badge sits under it so the name keeps the width. */}
          <div className="min-w-0 flex-1 pt-1.5">
            <h1 className="font-display text-heading font-semibold leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] [text-wrap:balance]">{boat.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <StatusBadge state={boat.status.state} bilingual={false} />
              <p className="text-caption tabular-nums text-ink-inverse-muted [overflow-wrap:anywhere]">{boat.registration}</p>
            </div>
          </div>
          <LanguageSwitch compact className="me-1" />
        </div>
        <div className="mx-auto max-w-[36rem] px-4 pb-3 pt-2.5">
          <LocationStrip location={location} facilities={facilities} />
          <button type="button" onClick={() => setPastOpen(true)} className="mt-2 min-h-11 rounded-control border border-gold-edge px-3 text-small font-semibold text-gold-bright"><MlEn text={t('pastEntries')} /></button>
        </div>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-gold-edge),transparent)] opacity-50" />
      </header>
      {pastOpen && <PastEntries boatId={boatId} revision={pastRevision} onClose={() => setPastOpen(false)} />}

      <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex max-w-[36rem] flex-col gap-4 px-4 pb-24 pt-5" aria-live="polite">
          <Intro boat={boat} />
          {exchanges.map((x) => (
            <ExchangeView
              key={x.id}
              x={x}
              speakingId={speakingId}
              onPlay={playReply}
              onRetry={() => send(x.id)}
              onTypeInstead={switchToText}
              onCorrected={(entry) => update(x.id, { entry })}
            />
          ))}
          <div ref={end} className="h-1" />
        </div>
      </main>

      <div className="relative z-10 rounded-t-[1.75rem] border-t border-gold-edge/25 bg-teak pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-14px_36px_-18px_var(--color-teak-deep)]">
        <div className="mx-auto flex max-w-[36rem] flex-col gap-3 px-4 pt-2">
          <AnimatePresence initial={false}>
            {micProblem && (
              <Notice
                key="mic"
                compact
                kind={micProblem}
                onDismiss={() => setMicProblem(null)}
                actions={<NoticeAction k="typeInstead" primary onClick={switchToText} />}
              />
            )}
            {location.status === 'denied' && !locDismissed && exchanges.length === 0 && (
              <Notice key="loc" compact kind="locDenied" onDismiss={() => setLocDismissed(true)} />
            )}
            {photo && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                className="flex items-center gap-3 rounded-card bg-teak-raised p-2.5 pe-1.5"
              >
                <img src={photo.previewUrl} alt="" className="size-14 rounded-control object-cover outline outline-1 -outline-offset-1 outline-white/10" />
                <MlEn text={t('photoReady')} className="min-w-0 flex-1 text-small" mlClassName="text-small" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label={pick(t('photoRemove'), lang)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-ink-inverse-muted hover:bg-teak active:scale-[0.96]"
                >
                  <Icon.Close size={18} />
                </button>
              </motion.div>
            )}
            {photoFailed && !photo && (
              <Notice key="photoFail" compact kind="photo" onDismiss={() => setPhotoFailed(false)} />
            )}
          </AnimatePresence>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          {mode === 'voice' ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full">
                <Wave level={recorder.level} active={micState === 'listening'} />
                {micState === 'listening' && (
                  <span className="absolute end-0 top-1/2 -translate-y-1/2 rounded-pill bg-teak-raised px-2 py-0.5 text-caption font-semibold tabular-nums text-gold-bright">
                    {recorder.secondsLeft} s
                  </span>
                )}
              </div>
              <div className="flex w-full items-center justify-between">
                <SideButton icon={<Icon.Camera size={24} />} k="photo" active={Boolean(photo)} disabled={micState === 'listening'} onClick={openCamera} />
                <RecordButton state={micState} level={recorder.level} label={pick(t(micState === 'listening' ? 'recordStop' : 'recordStart'), lang)} onPress={pressRecord} />
                <SideButton icon={<Icon.Keyboard size={24} />} k="type" disabled={micState === 'listening'} onClick={switchToText} />
              </div>
              <div role="status" className="mt-1 grid min-h-[3rem] place-items-center text-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={micState}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <MlEn text={t(STATE_LABEL[micState])} className="font-semibold" mlClassName="text-body" enClassName="!text-small font-normal" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <form onSubmit={sendTyped} className="flex flex-col gap-2.5">
              <label htmlFor="crew-typed">
                <MlEn text={t('typeLabel')} className="text-small font-semibold" mlClassName="text-small" />
              </label>
              <textarea
                id="crew-typed"
                ref={textArea}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                maxLength={600}
                enterKeyHint="send"
                placeholder="We emptied 800 litres from the toilet tank at Kumarakom STP"
                className="surface-light w-full resize-none rounded-control border border-field-border bg-kasavu px-3.5 py-3 text-ink placeholder:text-ink-muted/70 focus:outline-3 focus:outline-focus"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('voice')}
                  aria-label={pick(t('speak'), lang)}
                  className="grid size-12 shrink-0 place-items-center rounded-full border border-gold-edge/40 bg-teak-raised text-gold transition-[scale] duration-[var(--duration-press)] active:scale-[0.96]"
                >
                  <Icon.Mic size={22} />
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  aria-label={pick(t('photo'), lang)}
                  className={`grid size-12 shrink-0 place-items-center rounded-full border bg-teak-raised transition-[scale] duration-[var(--duration-press)] active:scale-[0.96] ${
                    photo ? 'border-gold text-gold-bright' : 'border-gold-edge/40 text-gold'
                  }`}
                >
                  <Icon.Camera size={22} />
                </button>
                <button
                  type="submit"
                  disabled={!typed.trim() || busy}
                  aria-busy={busy || undefined}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-gold px-5 font-semibold text-teak shadow-[var(--shadow-button)]
                    transition-[scale,opacity,background-color] duration-[var(--duration-press)] ease-[var(--ease-out)] enabled:active:scale-[0.96] hover:bg-gold-bright disabled:opacity-50"
                >
                  {busy ? (
                    <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  ) : (
                    <>
                      <Icon.Send size={18} />
                      <MlEn text={t('send')} layout="inline" mlClassName="text-small" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <audio ref={audio} preload="none" className="hidden" />
    </div>
  );
}

function SideButton({ icon, k, onClick, active = false, disabled = false }: { icon: ReactNode; k: CrewKey; onClick: () => void; active?: boolean; disabled?: boolean }) {
  const lang = useLang();
  const label = t(k);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={pick(label, lang)}
      className="group flex w-[5.5rem] flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <span
        className={`relative grid size-14 place-items-center rounded-full border bg-teak-raised transition-[scale,border-color] duration-[var(--duration-press)] ease-[var(--ease-out)] group-enabled:group-active:scale-[0.96] ${
          active ? 'border-gold text-gold-bright' : 'border-gold-edge/35 text-gold'
        }`}
      >
        {icon}
        {active && <span className="absolute -end-0.5 -top-0.5 size-3.5 rounded-full border-2 border-teak bg-gold-bright" />}
      </span>
      <span aria-hidden="true" className="flex flex-col items-center text-center leading-tight">
        {lang === 'both' && label.ml ? (
          <>
            <span lang="ml" className="whitespace-nowrap font-ml text-caption text-ink-inverse">
              {label.ml}
            </span>
            <span lang="en" className="text-[0.75rem] text-ink-inverse-muted">{label.en}</span>
          </>
        ) : (
          <span lang={lang === 'ml' && label.ml ? 'ml' : 'en'} className={`whitespace-nowrap text-caption text-ink-inverse ${lang === 'ml' && label.ml ? 'font-ml' : ''}`}>
            {pick(label, lang)}
          </span>
        )}
      </span>
    </button>
  );
}

function LocationStrip({ location, facilities }: { location: ReturnType<typeof useLocation>; facilities: Facility[] }) {
  const nearest = useMemo(() => {
    if (!location.position) return null;
    const pos = location.position;
    return facilities
      .filter((f) => f.open)
      .map((f) => ({ f, d: distanceM(pos, f) }))
      .sort((a, b) => a.d - b.d)[0] ?? null;
  }, [facilities, location.position]);

  const pickText = usePick();
  const off = location.status === 'denied' || location.status === 'unavailable';
  const label: CrewKey = location.status === 'ready' ? 'locReady' : off ? 'locOff' : location.status === 'idle' ? 'locIdle' : 'locFinding';
  // Until a fix is in, say what location is for. A denial has its own notice.
  const why = location.status !== 'ready' && location.status !== 'denied';
  const Glyph = off ? Icon.PinOff : Icon.Pin;

  return (
    <button
      type="button"
      onClick={location.start}
      disabled={location.status === 'ready' || location.status === 'finding'}
      className="flex w-full items-center gap-3 rounded-control bg-teak-raised px-3 py-2 text-start transition-[scale] duration-[var(--duration-press)] enabled:active:scale-[0.98]"
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full ${
          location.status === 'ready' ? 'bg-verified-soft text-verified' : off ? 'bg-declared-soft text-declared' : 'bg-teak text-gold'
        }`}
      >
        <Glyph size={17} className={location.status === 'finding' ? 'animate-pulse' : ''} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <MlEn text={t(label)} layout="inline" className="text-small font-semibold" mlClassName="text-small font-normal" />
          <span className="text-caption tabular-nums text-ink-inverse-muted">
            {location.status === 'ready' ? location.position.accuracy < 5 ? pickText(t('locAccurate')) : `± ${location.position.accuracy} m` : off ? pickText(t('tryAgain')) : ''}
          </span>
        </span>
        {why && <MlEn text={t('locWhy')} className="mt-0.5 text-caption text-ink-inverse-muted" mlClassName="text-caption" />}
        {nearest && (
          <span className="mt-0.5 block break-words text-caption text-ink-inverse-muted">
            {pickText(t('nearestOpen'))}: <span className="font-semibold tabular-nums text-gold-bright">{formatDistance(nearest.d)}</span> · {nearest.f.name}
          </span>
        )}
      </span>
    </button>
  );
}

function ExchangeView({
  x,
  speakingId,
  onPlay,
  onRetry,
  onTypeInstead,
  onCorrected,
}: {
  x: Exchange;
  speakingId: string | null;
  onPlay: (id: string) => void;
  onRetry: () => void;
  onTypeInstead: () => void;
  onCorrected: (entry: Entry) => void;
}) {
  const heard = x.result?.heard;
  const reply = x.result?.reply;
  return (
    <>
      {heard ? (
        <HeardBubble heard={heard} photoUrl={x.photoUrl} />
      ) : x.input === 'text' ? (
        <TypedBubble text={x.typed ?? ''} photoUrl={x.photoUrl} />
      ) : (
        <VoiceNoteBubble seconds={x.seconds ?? 1} photoUrl={x.photoUrl} />
      )}
      {x.status === 'sending' && x.stage && <SendProgress stage={x.stage} input={x.input} photo={Boolean(x.hasPhoto)} />}
      {reply && <ReplyBubble reply={reply} speaking={speakingId === reply.id} onPlay={() => onPlay(reply.id)} />}
      {x.entry && <Receipt entry={x.entry} token={x.token ?? null} onCorrected={onCorrected} />}
      {/* Nobody receives waste at a public bin, so there is no one to show the code to. */}
      {x.entry?.handoverCode && !x.entry.confirmation && methodOf(x.entry) !== 'waste_bin' && (
        <HandoverCard entry={{ ...x.entry, handoverCode: x.entry.handoverCode }} />
      )}
      {x.notice && (
        <Notice
          kind={x.notice.kind}
          detail={x.notice.detail}
          actions={
            x.notice.retry || x.input === 'voice' ? (
              <>
                {x.notice.retry && <NoticeAction k="tryAgain" primary onClick={onRetry} />}
                {x.input === 'voice' && <NoticeAction k="typeInstead" onClick={onTypeInstead} />}
              </>
            ) : undefined
          }
        />
      )}
    </>
  );
}

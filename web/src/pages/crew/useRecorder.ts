import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderFailure = 'unsupported' | 'denied';

interface Options {
  maxSeconds: number;
  onDone: (blob: Blob) => void;
  onFail: (why: RecorderFailure) => void;
}

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/**
 * Records one utterance with MediaRecorder. `stop` ends it and hands the recording to `onDone`;
 * `cancel` ends it and throws it away. `level` holds the live microphone level from 0 to 1,
 * read straight from an AnalyserNode every frame, for the sound wave.
 */
export function useRecorder({ maxSeconds, onDone, onFail }: Options) {
  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const level = useRef(0);
  const stopRef = useRef<() => void>(() => {});
  /** Set by cancel, so the stop that follows throws the recording away instead of sending it. */
  const discard = useRef(false);
  const callbacks = useRef({ onDone, onFail });
  callbacks.current = { onDone, onFail };

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      callbacks.current.onFail('unsupported');
      return false;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      callbacks.current.onFail('denied');
      return false;
    }

    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];

    // The level meter. If Web Audio is missing, the wave stays flat and recording still works.
    let audio: AudioContext | null = null;
    let frame = 0;
    try {
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      audio.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const read = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / samples.length);
        const target = Math.min(1, rms * 5);
        level.current += (target - level.current) * (target > level.current ? 0.6 : 0.15);
        frame = requestAnimationFrame(read);
      };
      read();
    } catch {
      audio = null;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      setSecondsLeft(Math.max(0, maxSeconds - Math.floor((Date.now() - started) / 1000)));
    }, 250);
    const limit = window.setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), maxSeconds * 1000);

    recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
    recorder.addEventListener('stop', () => {
      clearInterval(tick);
      clearTimeout(limit);
      cancelAnimationFrame(frame);
      audio?.close().catch(() => {});
      stream.getTracks().forEach((track) => track.stop());
      level.current = 0;
      setRecording(false);
      if (discard.current) return;
      callbacks.current.onDone(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    });

    stopRef.current = () => recorder.state !== 'inactive' && recorder.stop();
    discard.current = false;
    recorder.start();
    setSecondsLeft(maxSeconds);
    setRecording(true);
    return true;
  }, [maxSeconds]);

  const stop = useCallback(() => stopRef.current(), []);
  const cancel = useCallback(() => {
    discard.current = true;
    stopRef.current();
  }, []);

  // Release the microphone if the page goes away mid-recording.
  useEffect(() => () => stopRef.current(), []);

  return { recording, secondsLeft, level, start, stop, cancel };
}

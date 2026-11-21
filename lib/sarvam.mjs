import { parseModelJson } from './logic.mjs';

const BASE_URL = 'https://api.sarvam.ai';
const TIMEOUT_MS = 15_000;

export class SarvamError extends Error {}

/** Languages Bulbul can speak. Replies in any other language fall back to English. */
export const SPEECH_LANGUAGES = new Set([
  'hi-IN', 'en-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN', 'ml-IN', 'od-IN',
]);

// Sarvam's Bulbul v3 speaker recommendations for languages where we switch from Shubh.
const SPEAKERS = new Map([
  ['bn-IN', 'rehan'], ['gu-IN', 'ratan'], ['mr-IN', 'ratan'], ['pa-IN', 'mani'], ['ta-IN', 'ratan'],
]);

const AUDIO_EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
};

function apiKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SarvamError('SARVAM_API_KEY is not set');
  return key;
}

async function request(path, init) {
  let body;
  try {
    const res = await fetch(BASE_URL + path, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      await res.body?.cancel();
      throw new SarvamError(`${path} returned HTTP ${res.status}`);
    }
    body = await res.text();
  } catch (err) {
    if (err instanceof SarvamError) throw err;
    throw new SarvamError(`${path} did not respond (${err.name})`);
  }
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new SarvamError(`${path} returned a body that is not JSON`);
  }
}

const postJson = (path, payload, headers) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

/** mode "transcribe" keeps the spoken language; "translate" returns English. */
export async function speechToText(audio, mimeType, mode) {
  const form = new FormData();
  form.append('model', 'saaras:v4');
  form.append('mode', mode);
  form.append('file', new Blob([audio], { type: mimeType }), `audio.${AUDIO_EXTENSIONS[mimeType] ?? 'webm'}`);
  const r = await request('/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey() },
    body: form,
  });
  if (typeof r.transcript !== 'string') throw new SarvamError('/speech-to-text returned no transcript field');
  return { text: r.transcript, language: typeof r.language_code === 'string' ? r.language_code : null };
}

export async function translate(text, target, source) {
  if (!source) {
    if (/\p{Script=Malayalam}/u.test(text)) {
      source = 'ml-IN';
    } else {
      const detected = await postJson('/text-lid', { input: text }, { 'api-subscription-key': apiKey() });
      source = detected.language_code;
      if (typeof source !== 'string' || !source) throw new SarvamError('/text-lid returned no language');
    }
  }
  if (source === target) return { text, language: source };
  const r = await postJson(
    '/translate',
    // Sarvam-Translate keeps place names such as Kumarakom intact; the default Mayura model garbles them.
    { input: text, source_language_code: source, target_language_code: target, model: 'sarvam-translate:v1' },
    { 'api-subscription-key': apiKey() },
  );
  if (typeof r.translated_text !== 'string' || !r.translated_text.trim()) {
    throw new SarvamError('/translate returned no translation');
  }
  return { text: r.translated_text, language: source };
}

export async function textToSpeech(text, language) {
  const r = await postJson(
    '/text-to-speech',
    { text, language_code: language, speaker: SPEAKERS.get(language) ?? 'shubh', model: 'bulbul:v3', output_audio_codec: 'mp3' },
    { 'api-subscription-key': apiKey() },
  );
  if (!Array.isArray(r.audios) || typeof r.audios[0] !== 'string' || !r.audios[0]) {
    throw new SarvamError('/text-to-speech returned no audio');
  }
  return r.audios[0];
}

/** Gemma 4 takes text and base64 images. Image URLs are rejected by the API. */
export async function chat(messages) {
  const r = await postJson(
    '/v2/chat/completions',
    { model: 'gemma4', temperature: 0, max_tokens: 300, messages },
    { Authorization: `Bearer ${apiKey()}` },
  );
  const content = r.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new SarvamError('/v2/chat/completions returned no content');
  return content;
}

export async function chatJson(messages) {
  const reply = await chat(messages);
  try {
    return parseModelJson(reply);
  } catch {
    throw new SarvamError('/v2/chat/completions returned invalid structured data');
  }
}

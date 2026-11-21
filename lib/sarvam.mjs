const BASE_URL = 'https://api.sarvam.ai';

export class SarvamError extends Error {}

/** Languages Bulbul can speak. Replies in any other language fall back to English. */
export const SPEECH_LANGUAGES = new Set([
  'hi-IN', 'en-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN', 'ml-IN', 'od-IN',
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

async function request(path, init, timeoutMs = 45_000) {
  let res;
  try {
    res = await fetch(BASE_URL + path, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new SarvamError(`${path} did not respond (${err.name})`);
  }
  const body = await res.text();
  if (!res.ok) throw new SarvamError(`${path} returned ${res.status}: ${body.slice(0, 300)}`);
  try {
    return JSON.parse(body);
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
  return { text: r.transcript ?? '', language: r.language_code ?? null };
}

export async function translate(text, target, source = 'auto') {
  const r = await postJson(
    '/translate',
    // Sarvam-Translate keeps place names such as Kumarakom intact; the default Mayura model garbles them.
    { input: text, source_language_code: source, target_language_code: target, model: 'sarvam-translate:v1' },
    { 'api-subscription-key': apiKey() },
  );
  return { text: r.translated_text ?? '', language: r.source_language_code ?? null };
}

export async function textToSpeech(text, language) {
  const r = await postJson(
    '/text-to-speech',
    { text, language_code: language, model: 'bulbul:v3', output_audio_codec: 'mp3' },
    { 'api-subscription-key': apiKey() },
  );
  if (!r.audios?.[0]) throw new SarvamError('/text-to-speech returned no audio');
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
  if (!content) throw new SarvamError('/v2/chat/completions returned no content');
  return content;
}

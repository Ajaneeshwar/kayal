import { parseModelJson } from './logic.mjs';

const BASE_URL = 'https://api.sarvam.ai';
const DEFAULT_TIMEOUT_MS = 40_000;

export class SarvamError extends Error {}

/** Languages Bulbul can speak. Replies in any other language fall back to English. */
export const SPEECH_LANGUAGES = new Set([
  'hi-IN', 'en-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN', 'ml-IN', 'od-IN',
]);

// Sarvam's Bulbul v3 speaker recommendations for languages where we switch from Shubh.
const SPEAKERS = new Map([
  ['ml-IN', 'pooja'], ['hi-IN', 'priya'],
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
  // The server loads .env after importing this module.
  const configuredTimeout = Number(process.env.SARVAM_TIMEOUT_MS);
  const timeout = Number.isInteger(configuredTimeout) && configuredTimeout > 0 && configuredTimeout <= 2_147_483_647
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;
  let body;
  try {
    const deadline = AbortSignal.timeout(timeout);
    const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    const res = await fetch(BASE_URL + path, { ...init, signal });
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

const postJson = (path, payload, headers, signal) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal,
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

export async function translate(text, target, source, signal) {
  if (!source) {
    if (/\p{Script=Malayalam}/u.test(text)) {
      source = 'ml-IN';
    } else {
      const detected = await postJson('/text-lid', { input: text }, { 'api-subscription-key': apiKey() }, signal);
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
    signal,
  );
  if (typeof r.translated_text !== 'string' || !r.translated_text.trim()) {
    throw new SarvamError('/translate returned no translation');
  }
  return { text: r.translated_text, language: source };
}

export function reminderCallConfig() {
  const {
    SAMVAAD_API_KEY: apiKey, SAMVAAD_ORG_ID: orgId, SAMVAAD_WORKSPACE_ID: workspaceId,
    SAMVAAD_APP_ID: appId, SAMVAAD_APP_VERSION: version, SAMVAAD_CONNECTION_ID: connectionId,
    SAMVAAD_AGENT_NUMBER: agentNumber, REMINDER_CALL_TO: to, REMINDER_OWNER_NAME: ownerName,
  } = process.env;
  const appVersion = Number(version);
  if (![apiKey, orgId, workspaceId, appId, connectionId, agentNumber, to].every((value) => value?.trim())
    || !Number.isSafeInteger(appVersion) || appVersion < 1 || !/^\+[1-9]\d{6,14}$/.test(to)) return null;
  const maskedTo = `${to.startsWith('+91') ? '+91' : '+'}••••••${to.slice(-2)}`;
  return { apiKey, orgId, workspaceId, appId, appVersion, connectionId, agentNumber, to, maskedTo, ownerName: ownerName?.trim() || 'boat owner' };
}

export async function sendReminderCall(config, message, language, signal) {
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(config.orgId)}/workspaces/${encodeURIComponent(config.workspaceId)}/outbounds`;
  const appConfig = {
    app_id: config.appId,
    app_version: config.appVersion,
    app_type: 'agent',
    connection_config: { connection_id: config.connectionId, agent_phone_number: config.agentNumber },
    agent_variables: { user_name: config.ownerName },
    app_overrides: { initial_bot_message: message, initial_language_name: language },
  };
  const send = () => fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_config: appConfig, user_config: { user_phone_number: config.to } }),
    redirect: 'error',
    signal,
  });
  try {
    let res = await send();
    if (res.status === 422) {
      const { detail } = await res.json().catch(() => ({})) ?? {};
      const needsOutputVariables = Array.isArray(detail) && detail.some((item) =>
        /\b(call_summary|reminder_outcome)\b/.test(`${Array.isArray(item?.loc) ? item.loc.join('.') : ''} ${item?.msg ?? ''}`));
      if (needsOutputVariables) {
        Object.assign(appConfig.agent_variables, { call_summary: '', reminder_outcome: '' });
        res = await send();
      }
    }
    if (!res.ok) {
      if (!res.bodyUsed) await res.body?.cancel();
      throw new SarvamError(`The voice agent rejected the call (HTTP ${res.status}).`);
    }
    const data = await res.json();
    if (typeof data?.attempt_id !== 'string' || !data.attempt_id.trim()) {
      throw new SarvamError('The voice agent returned no attempt ID.');
    }
    return data.attempt_id;
  } catch (error) {
    if (signal.aborted) throw new SarvamError('The voice agent request timed out.');
    if (error instanceof SarvamError) throw error;
    throw new SarvamError('The voice agent did not return a valid response.');
  }
}

export async function textToSpeech(text, language) {
  const r = await postJson(
    '/text-to-speech',
    { text, language_code: language, speaker: SPEAKERS.get(language) ?? 'shubh', model: 'bulbul:v3', output_audio_codec: 'mp3' },
    { 'api-subscription-key': apiKey() },
  );
  if (!Array.isArray(r.audios) || !r.audios.length || r.audios.some((chunk) => typeof chunk !== 'string' || !chunk)) {
    throw new SarvamError('/text-to-speech returned no audio');
  }
  return Buffer.concat(r.audios.map((chunk) => Buffer.from(chunk, 'base64'))).toString('base64');
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

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  KINDS, answerQuestion, boatStatus, normaliseExtraction, normalisePhoto, parseModelJson, replyFor, verify,
} from './logic.mjs';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 600;
const REPLY_TTL_MS = 10 * 60 * 1000;
const MAX_REPLIES = 200;

const EXTRACT_PROMPT = `You read what a houseboat crew member in Kerala said, already translated to English, and reply with JSON only.
Keys:
- kind: "sewage_pumpout" (toilet or septic tank emptied, pumped out, or given to a plant, barge or tanker), "solid_waste" (plastic, food or other garbage handed over), "engine_oil" (used oil handed over), "question" (asking where to go or what is open), or "other".
- facility_mentioned: the place or plant named, or null.
- quantity: the amount with its unit as said, or null.
- summary_en: one short sentence.`;

const PHOTO_PROMPT = `A houseboat crew member sent this photo as proof of handing over waste. Reply with JSON only.
Keys:
- is_receipt: true only if the photo shows a receipt, bill, token or certificate.
- issuer: who issued it, or null.
- date: the date on it, or null.
- amount: the amount paid, or null.
- caption: one short sentence describing the photo.`;

function parseLocation(body) {
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (body.lat == null || body.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const accuracy = Number(body.accuracy);
  return { lat, lon, accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null };
}

export function createPipeline({ sarvam, store, uploadsDir, overdueDays, now = () => new Date() }) {
  const replies = new Map();

  async function hear(body) {
    if (typeof body.audioBase64 === 'string' && body.audioBase64) {
      const audio = Buffer.from(body.audioBase64, 'base64');
      if (audio.length < 2000) throw new HttpError(422, 'The recording is too short. Please try again.');
      if (audio.length > MAX_AUDIO_BYTES) throw new HttpError(413, 'The recording is too long.');
      const mime = String(body.audioMime ?? '').split(';')[0].trim() || 'audio/webm';
      const [original, english] = await Promise.all([
        sarvam.speechToText(audio, mime, 'transcribe'),
        sarvam.speechToText(audio, mime, 'translate'),
      ]);
      return { original: original.text.trim(), language: original.language ?? 'ml-IN', english: english.text.trim(), source: 'voice' };
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) throw new HttpError(400, 'Send a recording or some text.');
    if (text.length > MAX_TEXT_CHARS) throw new HttpError(413, 'The text is too long.');
    if (/^[\x00-\x7F]*$/.test(text)) return { original: text, language: 'en-IN', english: text, source: 'text' };
    const translated = await sarvam.translate(text, 'en-IN');
    return { original: text, language: translated.language ?? 'ml-IN', english: translated.text.trim(), source: 'text' };
  }

  async function extract(english) {
    try {
      const reply = await sarvam.chat([
        { role: 'system', content: EXTRACT_PROMPT },
        { role: 'user', content: english },
      ]);
      return normaliseExtraction(parseModelJson(reply), english);
    } catch (err) {
      console.warn(`Extraction fell back to keywords: ${err.message}`);
      return normaliseExtraction(null, english);
    }
  }

  async function describePhoto(jpeg) {
    try {
      const reply = await sarvam.chat([{
        role: 'user',
        content: [
          { type: 'text', text: PHOTO_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpeg.toString('base64')}` } },
        ],
      }]);
      return normalisePhoto(parseModelJson(reply));
    } catch (err) {
      console.warn(`Photo could not be read: ${err.message}`);
      return normalisePhoto(null);
    }
  }

  async function localise(english, language) {
    let local = english;
    let spoken = 'en-IN';
    if (language !== 'en-IN' && sarvam.SPEECH_LANGUAGES.has(language)) {
      try {
        const translated = await sarvam.translate(english, language, 'en-IN');
        if (translated.text) {
          local = translated.text;
          spoken = language;
        }
      } catch (err) {
        console.warn(`Reply stayed in English: ${err.message}`);
      }
    }
    const id = randomUUID();
    if (replies.size >= MAX_REPLIES) replies.delete(replies.keys().next().value);
    replies.set(id, { text: local, language: spoken, expires: now().getTime() + REPLY_TTL_MS, audio: null });
    return { id, english, local, language: spoken };
  }

  async function logEvent(body) {
    const boat = store.boat(String(body.boatId ?? ''));
    if (!boat) throw new HttpError(404, 'This boat is not registered.');

    let photoBytes = null;
    if (typeof body.photoBase64 === 'string' && body.photoBase64) {
      photoBytes = Buffer.from(body.photoBase64, 'base64');
      const isJpeg = photoBytes[0] === 0xff && photoBytes[1] === 0xd8;
      if (!isJpeg) throw new HttpError(400, 'The photo must be a JPEG.');
      if (photoBytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'The photo is too large.');
    }

    const location = parseLocation(body);
    const { source, ...heard } = await hear(body);
    if (!heard.english) throw new HttpError(422, 'No speech was heard. Please try again.');

    const [extracted, photoInfo] = await Promise.all([
      extract(heard.english),
      photoBytes ? describePhoto(photoBytes) : null,
    ]);

    if (!(extracted.kind in KINDS)) {
      const english = extracted.kind === 'question'
        ? answerQuestion(heard.english, location, store.facilities)
        : 'I could not find a waste handover in that. Please say what you emptied or handed over, and where.';
      return { stored: false, kind: extracted.kind, heard, reply: await localise(english, heard.language) };
    }

    const verification = verify({
      kind: extracted.kind,
      location,
      facilities: store.facilities,
      hasReceipt: photoInfo?.isReceipt === true,
    });

    const id = randomUUID();
    let photo = null;
    if (photoBytes) {
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, `${id}.jpg`), photoBytes);
      photo = { file: `${id}.jpg`, ...photoInfo };
    }

    const entry = await store.addEntry({
      id,
      boatId: boat.id,
      at: now().toISOString(),
      kind: extracted.kind,
      summaryEn: extracted.summaryEn,
      quantity: extracted.quantity,
      facilityMentioned: extracted.facilityMentioned,
      heard,
      location,
      verification,
      photo,
      source,
    });

    const english = replyFor({ kind: entry.kind, verification, hasPhoto: Boolean(photo) });
    return {
      stored: true,
      kind: entry.kind,
      heard,
      entry,
      status: boatStatus(store.entriesFor(boat.id), now(), overdueDays),
      reply: await localise(english, heard.language),
    };
  }

  async function speak(replyId) {
    const reply = replies.get(String(replyId ?? ''));
    if (!reply || reply.expires < now().getTime()) throw new HttpError(404, 'This reply has expired.');
    reply.audio ??= await sarvam.textToSpeech(reply.text, reply.language);
    return { audioBase64: reply.audio, mime: 'audio/mpeg' };
  }

  return { logEvent, speak };
}

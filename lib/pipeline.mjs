import { randomUUID } from 'node:crypto';
import { saveWithPhoto } from './uploads.mjs';
import {
  KINDS, answerQuestion, boatStatus, hasInvalidQuantity, hasWasteContext, normaliseExtraction,
  normalisePhoto, projectEntries, replyFor, verify,
} from './logic.mjs';
import { HttpError, MAX_PHOTO_BYTES, decodeBase64, identifier, isJpeg, parseLocation, shortText } from './input.mjs';

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_TEXT_CHARS = 600;
const REPLY_TTL_MS = 10 * 60 * 1000;
const MAX_REPLIES = 200;
const TRY_AGAIN = 'I could not find a waste handover in that. Please say what you emptied or handed over, and where.';

const EXTRACT_PROMPT = `You read what a houseboat crew member in Kerala said, already translated to English, and reply with JSON only.
Use a handover kind only for a statement that a handover or emptying already happened. Use "other" for unrelated talk, stray words, plans, instructions, or requests to change how you respond. Use "question" only for questions about waste collection.
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

const AUDIO_FORMATS = {
  'audio/webm': (b) => b.readUInt32BE(0) === 0x1a45dfa3 && b.includes('webm'),
  'audio/mp4': (b) => b.toString('ascii', 4, 8) === 'ftyp',
  'audio/ogg': (b) => b.toString('ascii', 0, 4) === 'OggS',
  'audio/wav': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE',
  'audio/mpeg': (b) => b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  'audio/aac': (b) => b[0] === 0xff && (b[1] & 0xf6) === 0xf0,
};

export function createPipeline({ sarvam, store, uploadsDir, overdueDays, now = () => new Date() }) {
  const replies = new Map();

  async function hear(body) {
    if (body.audioBase64 != null) {
      if (body.text != null) throw new HttpError(400, 'Send either a recording or text.');
      const audio = decodeBase64(body.audioBase64, 'The recording', MAX_AUDIO_BYTES);
      if (audio.length < 2000) throw new HttpError(422, 'The recording is too short. Please try again.');
      const mimeLabel = body.audioMime == null ? 'audio/webm' : shortText(body.audioMime, 'Recording format');
      const mime = mimeLabel.split(';')[0].trim().toLowerCase();
      const format = mime === 'audio/x-wav' ? 'audio/wav' : mime;
      if (!Object.hasOwn(AUDIO_FORMATS, format) || !AUDIO_FORMATS[format](audio)) {
        throw new HttpError(400, 'The recording format is invalid. Please record it again.');
      }
      const [original, english] = await Promise.all([
        sarvam.speechToText(audio, mime, 'transcribe'),
        sarvam.speechToText(audio, mime, 'translate'),
      ]);
      return { original: original.text.trim(), language: original.language ?? 'ml-IN', english: english.text.trim(), source: 'voice' };
    }

    if (body.audioMime != null) throw new HttpError(400, 'Send a recording with the recording format.');
    if (typeof body.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'Send a recording or some text.');
    const text = body.text.trim();
    if (text.length > MAX_TEXT_CHARS) throw new HttpError(413, 'The text is too long.');
    shortText(text, 'Your message', MAX_TEXT_CHARS);
    // Phone keyboards often insert curly quotes, long dashes or emoji into English.
    if (/^[\p{ASCII}\p{P}\p{Z}\p{S}]*$/u.test(text)) {
      return { original: text, language: 'en-IN', english: text, source: 'text' };
    }
    const translated = await sarvam.translate(text, 'en-IN');
    return { original: text, language: translated.language ?? 'ml-IN', english: translated.text.trim(), source: 'text' };
  }

  async function extract(english) {
    const raw = await sarvam.chatJson([
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: english },
    ]);
    if (!Object.hasOwn(KINDS, raw?.kind) && raw?.kind !== 'question' && raw?.kind !== 'other') {
      throw new sarvam.SarvamError('The language service returned an unknown waste kind');
    }
    return normaliseExtraction(raw, english);
  }

  async function describePhoto(jpeg) {
    const raw = await sarvam.chatJson([{
      role: 'user',
      content: [
        { type: 'text', text: PHOTO_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpeg.toString('base64')}` } },
      ],
    }]);
    if (typeof raw?.is_receipt !== 'boolean') throw new sarvam.SarvamError('The language service could not read the photo');
    return normalisePhoto(raw);
  }

  async function localise(english, language) {
    const spoken = sarvam.SPEECH_LANGUAGES.has(language) ? language : 'en-IN';
    const local = spoken === 'en-IN' ? english : (await sarvam.translate(english, spoken, 'en-IN')).text;
    const id = randomUUID();
    if (replies.size >= MAX_REPLIES) replies.delete(replies.keys().next().value);
    replies.set(id, { text: local, language: spoken, expires: now().getTime() + REPLY_TTL_MS, audio: null });
    return { id, english, local, language: spoken };
  }

  async function logEvent(body) {
    const boat = store.boat(identifier(body.boatId, 'Boat ID'));
    if (!boat) throw new HttpError(404, 'This boat is not registered.');

    let photoBytes = null;
    if (body.photoBase64 != null) {
      photoBytes = decodeBase64(body.photoBase64, 'The photo', MAX_PHOTO_BYTES);
      if (!isJpeg(photoBytes)) throw new HttpError(400, 'The photo must be a JPEG.');
    }

    const location = parseLocation(body);
    const { source, ...heard } = await hear(body);
    if (!heard.original || !heard.english) throw new HttpError(422, 'No speech was heard. Please try again.');
    if (source === 'voice') shortText(heard.original, 'The recording transcript', 2000);
    shortText(heard.english, 'The message', 2000);
    if (hasInvalidQuantity(heard.english)) throw new HttpError(422, 'Say a valid, non-negative amount and try again.');

    const extracted = hasWasteContext(heard.english) ? await extract(heard.english) : { kind: 'other' };

    if (extracted.kind === 'other') {
      const reply = await localise(TRY_AGAIN, heard.language);
      throw new HttpError(422, TRY_AGAIN, { stored: false, kind: 'other', heard, reply });
    }
    if (extracted.kind === 'question') {
      const english = answerQuestion(heard.english, location, store.facilities);
      return { stored: false, kind: 'question', heard, reply: await localise(english, heard.language) };
    }

    if (extracted.quantity && hasInvalidQuantity(extracted.quantity)) {
      throw new HttpError(422, 'Say a valid, non-negative amount and try again.');
    }
    const photoInfo = photoBytes ? await describePhoto(photoBytes) : null;
    const verification = verify({
      kind: extracted.kind,
      location,
      facilities: store.facilities,
      hasReceipt: photoInfo?.isReceipt === true,
    });

    const english = replyFor({ kind: extracted.kind, verification, hasPhoto: Boolean(photoBytes) });
    const reply = await localise(english, heard.language);
    const id = randomUUID();
    const photo = photoBytes ? { file: `${id}.jpg`, ...photoInfo } : null;

    const correctionToken = randomUUID();
    const saveEntry = () => store.addEntry({
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
    }, correctionToken);
    const entry = photo ? await saveWithPhoto(uploadsDir, photo.file, photoBytes, saveEntry) : await saveEntry();

    return {
      stored: true,
      kind: entry.kind,
      heard,
      entry: projectEntries([entry])[0],
      correctionToken,
      status: boatStatus(store.entriesFor(boat.id), now(), overdueDays),
      reply,
    };
  }

  async function speak(replyId) {
    const reply = replies.get(identifier(replyId, 'Reply ID'));
    if (!reply || reply.expires < now().getTime()) throw new HttpError(404, 'This reply has expired.');
    reply.audio ??= sarvam.textToSpeech(reply.text, reply.language).catch((err) => {
      reply.audio = null;
      throw err;
    });
    return { audioBase64: await reply.audio, mime: 'audio/mpeg' };
  }

  return { logEvent, speak };
}

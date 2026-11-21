import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError, MAX_PHOTO_BYTES, decodeBase64, identifier, isJpeg, parseLocation, shortText } from './input.mjs';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const PNG_END = Buffer.from('0000000049454e44ae426082', 'hex');
const IMAGE_FORMATS = {
  'image/jpeg': { ext: 'jpg', valid: isJpeg },
  'image/png': {
    ext: 'png',
    valid: (bytes) => bytes.length >= 45 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)
      && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.subarray(-12).equals(PNG_END),
  },
  'image/webp': {
    ext: 'webp',
    valid: (bytes) => bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF'
      && bytes.readUInt32LE(4) + 8 === bytes.length && bytes.toString('ascii', 8, 12) === 'WEBP'
      && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16)),
  },
};

const REPORT_PROMPT = `A tourist sent this photo in a report about dumping near a houseboat. Describe only what is visible. Reply with JSON only.
- description: one short English sentence about the visible scene.
- plausible_waste_in_water: true only if visible waste appears to be in the water, including floating solid waste or a visible discharge. If unclear, false. A photo alone cannot establish who dumped anything.`;

export async function submitReport({ body, sarvam, store, uploadsDir }) {
  const header = typeof body.photoDataUri === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,/.exec(body.photoDataUri);
  if (!header) throw new HttpError(400, 'Send a JPEG, PNG or WebP photo as a base64 data URI.');
  const mime = header[1];
  const { ext, valid } = IMAGE_FORMATS[mime];
  const bytes = decodeBase64(body.photoDataUri.slice(header[0].length), 'The photo', MAX_PHOTO_BYTES);
  if (!valid(bytes)) throw new HttpError(400, 'The uploaded file is not a valid image.');

  const note = body.note == null || (typeof body.note === 'string' && !body.note.trim())
    ? null
    : shortText(body.note, 'The note', 600);
  const boatId = body.boatId == null ? null : identifier(body.boatId, 'Boat ID');
  if (boatId !== null && !store.boat(boatId)) throw new HttpError(404, 'This boat is not registered.');

  let location = null;
  if (body.location != null) {
    if (typeof body.location !== 'object' || Array.isArray(body.location)) {
      throw new HttpError(400, 'Send location as an object with latitude and longitude.');
    }
    location = parseLocation(body.location, true);
  }

  const raw = await sarvam.chatJson([{
    role: 'user',
    content: [
      { type: 'text', text: REPORT_PROMPT },
      { type: 'image_url', image_url: { url: body.photoDataUri } },
    ],
  }]);
  const description = typeof raw?.description === 'string'
    ? raw.description.replace(/[<>\s\x00-\x1f\x7f]+/g, ' ').trim().slice(0, 240)
    : '';
  if (!description || typeof raw?.plausible_waste_in_water !== 'boolean') {
    throw new sarvam.SarvamError('The language service did not describe the report photo');
  }

  const id = randomUUID();
  const file = `${id}.${ext}`;
  const target = path.join(uploadsDir, file);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  try {
    return await store.addReport({
      id, boatId, note, location, at: new Date().toISOString(),
      photo: { file, mime }, description, plausibleWasteInWater: raw.plausible_waste_in_water, reviewedAt: null,
    });
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
}

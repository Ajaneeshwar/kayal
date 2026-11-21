export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function shortText(value, name, max = 80) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) {
    throw new HttpError(400, `${name} is required and must be at most ${max} characters.`);
  }
  if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) {
    throw new HttpError(400, `${name} must be plain text.`);
  }
  return text;
}

export function identifier(value, name) {
  if (typeof value !== 'string' || !/^[\w-]{1,80}$/.test(value)) {
    throw new HttpError(400, `${name} is required and must be a valid ID.`);
  }
  return value;
}

export function correctionQuantity(value) {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  const quantity = typeof text === 'string' ? text.trim() : '';
  if (quantity.length > 80 || !/^(?:\p{Nd}+|\p{Nd}{1,3}(?:,\p{Nd}{3})+)(?:\.\p{Nd}+)?(?: *\p{L}[\p{L} .-]*)?$/u.test(quantity)) {
    throw new HttpError(400, 'Enter a non-negative quantity, such as 8000 litres or 4 bags.');
  }
  return quantity;
}

export function parseLocation({ lat, lon, accuracy }, required = false) {
  if (!required && lat == null && lon == null && accuracy == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new HttpError(400, 'Send a valid latitude and longitude.');
  }
  if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    throw new HttpError(400, 'Location accuracy must be a non-negative number.');
  }
  return { lat, lon, accuracy: accuracy == null ? null : Math.round(accuracy) };
}

export function decodeBase64(value, name, max) {
  if (typeof value !== 'string' || !value) {
    throw new HttpError(400, `${name} must be a base64 string.`);
  }
  if (value.length > Math.ceil(max / 3) * 4) throw new HttpError(413, `${name} is too large.`);
  const bytes = Buffer.from(value, 'base64');
  const canonical = bytes.toString('base64');
  if (value !== canonical && value !== canonical.replace(/=+$/, '')) {
    throw new HttpError(400, `${name} is not valid base64.`);
  }
  if (bytes.length > max) throw new HttpError(413, `${name} is too large.`);
  return bytes;
}

export function isJpeg(bytes) {
  return bytes.length > 20 && bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes.includes(Buffer.from([0xff, 0xda])) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
}

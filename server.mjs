import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import * as sarvam from './lib/sarvam.mjs';
import { Store } from './lib/store.mjs';
import { seed } from './lib/seed.mjs';
import { createPipeline } from './lib/pipeline.mjs';
import { submitReport } from './lib/reports.mjs';
import { createEvents } from './lib/events.mjs';
import { HttpError, correctionQuantity, identifier, parseLocation, shortText } from './lib/input.mjs';
import { boatStatus, checkChain, projectEntries, reminderMessage } from './lib/logic.mjs';
import { canConfirm, custodyTotals, HANDOVER_ALPHABET, isVehicleOperator, normaliseVehicle, OPERATOR_TYPES } from './lib/confirm.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // No .env file: the settings come from the real environment.
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
// The new frontend (web/, built to web/dist). Add a screen's path here when it moves over from public/.
const WEB_DIST = path.join(ROOT, 'web', 'dist');
const WEB_APP_PATHS = ['/', '/dashboard', '/boat/:boatId', '/boat/:boatId/sticker', '/crew', '/operator'];
const webAppOwns = (pathname) =>
  WEB_APP_PATHS.some((p) => new RegExp(`^${p.replace(/:[\w]+/g, '[\\w-]+')}$`).test(pathname)) &&
  existsSync(path.join(WEB_DIST, 'index.html'));
const OVERDUE_DAYS = Number(process.env.OVERDUE_DAYS || 90);
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const configuredBodyTimeout = Number(process.env.BODY_TIMEOUT_MS);
const BODY_TIMEOUT_MS = Number.isInteger(configuredBodyTimeout) && configuredBodyTimeout > 0 && configuredBodyTimeout <= 2_147_483_647
  ? configuredBodyTimeout
  : 40_000;
const FEED_LIMIT = 100;

const PAGES = { '/': 'index.html', '/crew': 'crew.html', '/dashboard': 'dashboard.html' };
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json; charset=utf-8',
};
const WASTE_TYPES = ['sewage', 'solid', 'oil'];

const store = await Store.open(DATA_DIR, seed);
const pipeline = createPipeline({ sarvam, store, uploadsDir: UPLOADS_DIR, overdueDays: OVERDUE_DAYS });
const events = createEvents();
const reminderCalls = [];
let nextReminderAt = 0;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function sendFile(res, file, status = 200) {
  let body;
  try {
    body = await readFile(file);
  } catch {
    throw new HttpError(404, 'Not found.');
  }
  res.writeHead(status, { 'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}

async function readJson(req) {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    throw new HttpError(413, 'The upload is too large.');
  }
  const chunks = [];
  let size = 0;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new HttpError(408, 'The upload took too long. Please try again.')), BODY_TIMEOUT_MS);
    const finish = (error) => {
      clearTimeout(timeout);
      req.off('data', onData);
      req.off('end', onEnd);
      if (error) reject(error);
      else resolve();
    };
    const onEnd = () => finish();
    const onData = (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) return finish(new HttpError(413, 'The upload is too large.'));
      chunks.push(chunk);
    };
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', () => finish(new HttpError(400, 'The upload was interrupted.')));
  });
  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new HttpError(400, 'The request body is not valid JSON.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Send a JSON object.');
  }
  return body;
}

function pinMatches(value) {
  const given = Buffer.from(String(value ?? ''));
  const expected = Buffer.from(ADMIN_PIN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function requireAdmin(req) {
  if (!ADMIN_PIN) return;
  if (!pinMatches(req.headers['x-admin-pin'])) {
    throw new HttpError(401, 'The admin PIN is wrong.');
  }
}

function readVehicleNumber(value) {
  const number = shortText(value, 'Vehicle number', 40);
  if (!/^[A-Z0-9]+$/.test(normaliseVehicle(number))) throw new HttpError(400, 'Enter a valid vehicle number.');
  return number;
}

function requestPath(target) {
  const raw = target.split('?')[0];
  if (!raw.startsWith('/') || raw.startsWith('//')) throw new HttpError(400, 'The request path is invalid.');
  try {
    for (const part of raw.split('/')) {
      const decoded = decodeURIComponent(part);
      if (decoded === '.' || decoded === '..' || /[\/\\?#\x00-\x1f\x7f]/.test(decoded)) {
        throw new Error();
      }
    }
    return new URL(target, 'http://localhost').pathname;
  } catch {
    throw new HttpError(400, 'The request path is invalid.');
  }
}

function apiMethod(pathname) {
  if (reminderPath.test(pathname)) return 'POST';
  if (/^\/api\/(?:health|state|events|boats\/[\w-]+|operators\/[\w-]+\/(?:pending|handover\/[\w-]+))$/.test(pathname)) return 'GET';
  if (/^\/api\/(?:log(?:\/[\w-]+\/(?:correction|void|confirm))?|speak|signin|boats|operators(?:\/[\w-]+\/unload)?|facilities(?:\/[\w-]+\/status)?|reports(?:\/[\w-]+\/review)?)$/.test(pathname)) return 'POST';
  return null;
}

const reminderPath = /^\/api\/boats\/([\w-]+)\/reminder-call$/;

async function callOwner(req, res, boatId) {
  requireAdmin(req);
  const { language = 'Malayalam' } = await readJson(req);
  if (language !== 'Malayalam' && language !== 'English') throw new HttpError(400, 'Choose Malayalam or English.');
  const boat = store.boat(boatId);
  if (!boat) throw new HttpError(404, 'This boat is not registered.');
  const config = sarvam.reminderCallConfig();
  if (!config || (language === 'Malayalam' && !process.env.SARVAM_API_KEY)) {
    throw new HttpError(503, 'Reminder calls are not configured.');
  }

  const retryAfterSeconds = Math.ceil((nextReminderAt - performance.now()) / 1000);
  if (retryAfterSeconds > 0) {
    res.setHeader('Retry-After', retryAfterSeconds);
    throw new HttpError(429, 'A reminder call was just requested.', { retryAfterSeconds });
  }
  nextReminderAt = performance.now() + 60_000;

  const now = new Date();
  const status = boatStatus(store.entriesFor(boatId), now, OVERDUE_DAYS);
  const { english, notDueSoon } = reminderMessage(boat.name, config.ownerName, status, store.facilities, now);
  const signal = AbortSignal.timeout(20_000);
  let local = english;
  let attemptId;
  let at;
  try {
    if (language === 'Malayalam') local = (await sarvam.translate(english, 'ml-IN', 'en-IN', signal)).text;
    at = new Date().toISOString();
    attemptId = await sarvam.sendReminderCall(config, local, language, signal);
  } catch (error) {
    if (!(error instanceof sarvam.SarvamError)) throw error;
    throw new HttpError(502, signal.aborted ? 'The reminder request timed out.' : error.message);
  } finally {
    nextReminderAt = performance.now() + 60_000;
  }
  const to = config.maskedTo;
  reminderCalls.unshift({ boatId, at, attemptId, language, to });
  if (reminderCalls.length > 20) reminderCalls.pop();
  return sendJson(res, 202, { attemptId, to, language, message: { english, local }, notDueSoon });
}

function boatView(boat, now) {
  return { ...boat, status: boatStatus(store.entriesFor(boat.id), now, OVERDUE_DAYS) };
}

function stateView() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const operators = store.operators;
  const entries = projectEntries(store.entries, operators);
  return {
    boats: store.boats.map((b) => boatView(b, now)),
    facilities: store.facilities,
    operators,
    custody: custodyTotals(operators, store.entries, now),
    entries: entries.slice(-FEED_LIMIT).reverse(),
    weeklyEntryCount: entries.filter((entry) => {
      const at = new Date(entry.at);
      return at >= weekStart && at <= now;
    }).length,
    reports: store.reports.slice().reverse(),
    reminderCalls,
    chain: checkChain(store.entries),
    overdueDays: OVERDUE_DAYS,
    adminPinRequired: Boolean(ADMIN_PIN),
  };
}

async function route(req, res) {
  const pathname = requestPath(req.url);
  const method = req.method;
  const allowedMethod = apiMethod(pathname);
  if (allowedMethod && method !== allowedMethod) {
    res.setHeader('Allow', allowedMethod);
    throw new HttpError(405, 'Method not allowed.');
  }
  if (allowedMethod === 'GET' && (Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'])) {
    throw new HttpError(400, 'This request does not take a body.');
  }

  if (method === 'GET') {
    if (pathname === '/api/health') return sendJson(res, 200, {
      ok: true, sarvamKey: Boolean(process.env.SARVAM_API_KEY), reminderCallConfigured: Boolean(sarvam.reminderCallConfig()),
    });
    if (pathname === '/api/state') return sendJson(res, 200, stateView());
    if (pathname === '/api/events') return events.subscribe(res);

    const operatorRead = pathname.match(/^\/api\/operators\/([\w-]+)\/(?:pending|handover\/([\w-]+))$/);
    if (operatorRead) {
      const [, id, code] = operatorRead;
      const operator = store.authenticateOperator(id, req.headers['x-operator-code']);
      const now = new Date();
      const facility = store.facilities.find((item) => item.id === operator.facilityId);
      const entries = projectEntries(store.entries, store.operators);
      if (code !== undefined) {
        const handoverCode = code.toUpperCase();
        if (handoverCode.length !== 6 || [...handoverCode].some((char) => !HANDOVER_ALPHABET.includes(char))) {
          throw new HttpError(400, 'Enter a valid six-character handover code.');
        }
        const entry = entries.find((item) => item.handoverCode === handoverCode);
        if (!entry) throw new HttpError(404, 'This handover code was not found.');
        if (!canConfirm(operator, entry, now, facility)) throw new HttpError(403, 'This operator cannot confirm this entry.');
        return sendJson(res, 200, { entry });
      }
      const pending = entries.filter((entry) => !entry.confirmation && canConfirm(operator, entry, now, facility));
      pending.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      return sendJson(res, 200, { operator, pending });
    }

    const boatApi = pathname.match(/^\/api\/boats\/([\w-]+)$/);
    if (boatApi) {
      const boat = store.boat(boatApi[1]);
      if (!boat) throw new HttpError(404, 'This boat is not registered.');
      return sendJson(res, 200, {
        boat: boatView(boat, new Date()),
        entries: store.entriesFor(boat.id).reverse(),
        facilities: store.facilities,
      });
    }

    if (webAppOwns(pathname)) {
      res.setHeader('Cache-Control', 'no-cache');
      return sendFile(res, path.join(WEB_DIST, 'index.html'));
    }
    const webAsset = pathname.match(/^\/(assets\/[\w.-]+|favicon\.svg)$/);
    if (webAsset && existsSync(path.join(WEB_DIST, webAsset[1]))) {
      if (webAsset[1].startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return sendFile(res, path.join(WEB_DIST, webAsset[1]));
    }
    if (PAGES[pathname]) return sendFile(res, path.join(PUBLIC_DIR, PAGES[pathname]));
    if (/^\/boat\/[\w-]+$/.test(pathname)) return sendFile(res, path.join(PUBLIC_DIR, 'boat.html'));

    const upload = pathname.match(/^\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/);
    if (upload) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return sendFile(res, path.join(UPLOADS_DIR, upload[1]));
    }

    if (pathname.startsWith('/static/')) {
      const file = path.join(PUBLIC_DIR, path.normalize(pathname.slice('/static/'.length)));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'Not found.');
      return sendFile(res, file);
    }
    if (!/^\/api(?:\/|$)/.test(pathname) && !path.posix.extname(pathname) && /\btext\/html\b/i.test(req.headers.accept ?? '') && existsSync(path.join(WEB_DIST, 'index.html'))) {
      res.setHeader('Cache-Control', 'no-cache');
      return sendFile(res, path.join(WEB_DIST, 'index.html'), 404);
    }
    throw new HttpError(404, 'Not found.');
  }

  if (method === 'POST') {
    const reminder = pathname.match(reminderPath);
    if (reminder) return callOwner(req, res, reminder[1]);

    if (pathname === '/api/log') {
      const result = await pipeline.logEvent(await readJson(req));
      if (result.stored) events.publish('entry', { action: 'created', id: result.entry.id, boatId: result.entry.boatId });
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/speak') return sendJson(res, 200, await pipeline.speak((await readJson(req)).replyId));

    if (pathname === '/api/operators') {
      requireAdmin(req);
      const body = await readJson(req);
      const { type, code } = body;
      if (!OPERATOR_TYPES.includes(type)) throw new HttpError(400, 'Choose a valid operator type.');
      if (typeof code !== 'string' || !/^[\x21-\x7e]{1,64}$/.test(code) || code.includes(',')) {
        throw new HttpError(400, 'Enter a sign-in code of 1–64 printable ASCII characters without spaces or commas.');
      }
      const facilityId = type === 'plant' || body.facilityId != null ? identifier(body.facilityId, 'Facility ID') : null;
      if (facilityId && !store.facilities.some((facility) => facility.id === facilityId)) {
        throw new HttpError(404, 'This collection point does not exist.');
      }
      const vehicleNumber = isVehicleOperator(type) || body.vehicleNumber != null
        ? readVehicleNumber(body.vehicleNumber) : null;
      const operator = await store.addOperator({ name: shortText(body.name, 'Operator name'), type, facilityId, vehicleNumber, code });
      return sendJson(res, 201, { operator });
    }

    const operatorUnload = pathname.match(/^\/api\/operators\/([\w-]+)\/unload$/);
    if (operatorUnload) {
      const operator = store.authenticateOperator(operatorUnload[1], req.headers['x-operator-code']);
      const { vehicleNumber, quantity } = await readJson(req);
      const unload = await store.addUnload({
        operator, vehicleNumber: readVehicleNumber(vehicleNumber), quantity: correctionQuantity(quantity),
      });
      return sendJson(res, 201, { unload });
    }

    const logConfirm = pathname.match(/^\/api\/log\/([\w-]+)\/confirm$/);
    if (logConfirm) {
      const operator = store.authenticateOperator(identifier(req.headers['x-operator-id'], 'Operator ID'), req.headers['x-operator-code']);
      const { decision, quantity, note } = await readJson(req);
      if (decision !== 'received' && decision !== 'not_received') throw new HttpError(400, 'Choose received or not received.');
      if (quantity != null && typeof quantity !== 'string') throw new HttpError(400, 'Send quantity as text.');
      const { entry, confirmation, changed } = await store.confirmEntry({
        entryId: logConfirm[1], operator, decision,
        quantity: quantity == null ? null : correctionQuantity(quantity),
        note: typeof note === 'string' && !note.trim() || note == null ? null : shortText(note, 'Note', 200),
      });
      if (changed) events.publish('entry', { action: entry.disputed ? 'disputed' : 'confirmed', id: entry.id, boatId: entry.boatId });
      return sendJson(res, 200, { entry, confirmation });
    }

    if (pathname === '/api/reports') {
      const report = await submitReport({ body: await readJson(req), sarvam, store, uploadsDir: UPLOADS_DIR });
      events.publish('report', { action: 'created', id: report.id, boatId: report.boatId });
      return sendJson(res, 201, { report });
    }

    const reportReview = pathname.match(/^\/api\/reports\/([\w-]+)\/review$/);
    if (reportReview) {
      requireAdmin(req);
      if (Object.keys(await readJson(req)).length) throw new HttpError(400, 'Send an empty JSON object to review a report.');
      const result = await store.reviewReport(reportReview[1]);
      if (!result) throw new HttpError(404, 'This report does not exist.');
      if (result.changed) events.publish('report', { action: 'reviewed', id: result.report.id, boatId: result.report.boatId });
      return sendJson(res, 200, { report: result.report });
    }

    const logCorrection = pathname.match(/^\/api\/log\/([\w-]+)\/correction$/);
    if (logCorrection) {
      const body = await readJson(req);
      const { entry, correction, changed } = await store.correctEntry({
        entryId: logCorrection[1],
        boatId: identifier(body.boatId, 'Boat ID'),
        quantity: correctionQuantity(body.quantity),
        correctionToken: identifier(body.correctionToken, 'Correction token'),
      });
      if (changed) events.publish('correction', {
        action: 'corrected', id: correction.id, entryId: entry.id, boatId: entry.boatId,
      });
      return sendJson(res, 200, { entry, correction });
    }

    const logVoid = pathname.match(/^\/api\/log\/([\w-]+)\/void$/);
    if (logVoid) {
      requireAdmin(req);
      const body = await readJson(req);
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason || [...reason].length > 200) throw new HttpError(400, 'Reason is required and must be at most 200 characters.');
      const { entry, void: voidRecord, changed } = await store.voidEntry({ entryId: logVoid[1], reason });
      if (changed) events.publish('entry', { action: 'voided', id: entry.id, boatId: entry.boatId });
      return sendJson(res, 200, { entry, void: voidRecord });
    }

    if (pathname === '/api/signin') {
      const body = await readJson(req);
      if (body.role !== 'inspector') throw new HttpError(400, 'Only the inspector signs in with a PIN.');
      if (typeof body.pin !== 'string' || !body.pin || body.pin.length > 64) throw new HttpError(400, 'Enter the PIN.');
      if (ADMIN_PIN && !pinMatches(body.pin)) throw new HttpError(401, 'That PIN is wrong.');
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/boats') {
      requireAdmin(req);
      const body = await readJson(req);
      const boat = await store.addBoat({
        name: shortText(body.name, 'Boat name'),
        registration: shortText(body.registration, 'Registration number', 40),
      });
      events.publish('boat', { action: 'created', id: boat.id });
      return sendJson(res, 201, { boat: boatView(boat, new Date()) });
    }

    if (pathname === '/api/facilities') {
      requireAdmin(req);
      const body = await readJson(req);
      const { lat, lon } = parseLocation(body, true);
      if (!Array.isArray(body.accepts) || !body.accepts.length || !body.accepts.every((type) => WASTE_TYPES.includes(type))) {
        throw new HttpError(400, 'Choose one or more valid waste types.');
      }
      const accepts = [...new Set(body.accepts)];
      const facility = await store.addFacility({ name: shortText(body.name, 'Name'), accepts, lat, lon, radiusM: 400 });
      events.publish('facility', { action: 'created', id: facility.id });
      return sendJson(res, 201, { facility });
    }

    const facilityStatus = pathname.match(/^\/api\/facilities\/([\w-]+)\/status$/);
    if (facilityStatus) {
      requireAdmin(req);
      const { open } = await readJson(req);
      if (typeof open !== 'boolean') throw new HttpError(400, 'Send true or false for whether the point is open.');
      const result = await store.setFacilityOpen(facilityStatus[1], open);
      if (!result) throw new HttpError(404, 'This collection point does not exist.');
      const { facility, changed } = result;
      if (changed) events.publish('facility', { action: 'updated', id: facility.id });
      return sendJson(res, 200, { facility });
    }
    throw new HttpError(404, 'Not found.');
  }

  throw new HttpError(405, 'Method not allowed.');
}

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (err) {
    if (res.destroyed) return;
    if (res.headersSent) return res.destroy();
    if (!req.complete) {
      res.setHeader('Connection', 'close');
      req.resume();
    }
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message, ...err.details });
    console.error(`${req.method} request failed: ${err.message}`);
    if (err instanceof sarvam.SarvamError) {
      return sendJson(res, 502, { error: 'The language service did not answer. Please try again.' });
    }
    sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Kayal Log is running at http://${HOST}:${PORT}`);
  if (!process.env.SARVAM_API_KEY) console.warn('SARVAM_API_KEY is not set, so voice logging will fail.');
});

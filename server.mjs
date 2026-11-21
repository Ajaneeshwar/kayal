import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import * as sarvam from './lib/sarvam.mjs';
import { Store } from './lib/store.mjs';
import { seed } from './lib/seed.mjs';
import { HttpError, createPipeline } from './lib/pipeline.mjs';
import { boatStatus, checkChain } from './lib/logic.mjs';

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
const OVERDUE_DAYS = Number(process.env.OVERDUE_DAYS || 90);
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const FEED_LIMIT = 100;

const PAGES = { '/': 'index.html', '/crew': 'crew.html', '/dashboard': 'dashboard.html' };
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
const WASTE_TYPES = ['sewage', 'solid', 'oil'];

const store = await Store.open(DATA_DIR, seed);
const pipeline = createPipeline({ sarvam, store, uploadsDir: UPLOADS_DIR, overdueDays: OVERDUE_DAYS });

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function sendFile(res, file) {
  let body;
  try {
    body = await readFile(file);
  } catch {
    throw new HttpError(404, 'Not found.');
  }
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'The upload is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'The request body is not valid JSON.');
  }
}

function requireAdmin(req) {
  if (!ADMIN_PIN) return;
  const given = Buffer.from(String(req.headers['x-admin-pin'] ?? ''));
  const expected = Buffer.from(ADMIN_PIN);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, 'The admin PIN is wrong.');
  }
}

function shortText(value, name, max = 80) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s || s.length > max) throw new HttpError(400, `${name} is required and must be at most ${max} characters.`);
  return s;
}

function boatView(boat, now) {
  return { ...boat, status: boatStatus(store.entriesFor(boat.id), now, OVERDUE_DAYS) };
}

function stateView() {
  const now = new Date();
  return {
    boats: store.boats.map((b) => boatView(b, now)),
    facilities: store.facilities,
    entries: store.entries.slice(-FEED_LIMIT).reverse(),
    chain: checkChain(store.entries),
    overdueDays: OVERDUE_DAYS,
    adminPinRequired: Boolean(ADMIN_PIN),
  };
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const method = req.method;

  if (method === 'GET') {
    if (pathname === '/api/health') return sendJson(res, 200, { ok: true, sarvamKey: Boolean(process.env.SARVAM_API_KEY) });
    if (pathname === '/api/state') return sendJson(res, 200, stateView());

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

    if (PAGES[pathname]) return sendFile(res, path.join(PUBLIC_DIR, PAGES[pathname]));
    if (/^\/boat\/[\w-]+$/.test(pathname)) return sendFile(res, path.join(PUBLIC_DIR, 'boat.html'));

    const upload = pathname.match(/^\/uploads\/([0-9a-f-]{36}\.jpg)$/);
    if (upload) return sendFile(res, path.join(UPLOADS_DIR, upload[1]));

    if (pathname.startsWith('/static/')) {
      const file = path.join(PUBLIC_DIR, path.normalize(pathname.slice('/static/'.length)));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'Not found.');
      return sendFile(res, file);
    }
    throw new HttpError(404, 'Not found.');
  }

  if (method === 'POST') {
    if (pathname === '/api/log') return sendJson(res, 200, await pipeline.logEvent(await readJson(req)));
    if (pathname === '/api/speak') return sendJson(res, 200, await pipeline.speak((await readJson(req)).replyId));

    if (pathname === '/api/boats') {
      requireAdmin(req);
      const body = await readJson(req);
      const boat = await store.addBoat({
        name: shortText(body.name, 'Boat name'),
        registration: shortText(body.registration, 'Registration number', 40),
      });
      return sendJson(res, 201, { boat: boatView(boat, new Date()) });
    }

    if (pathname === '/api/facilities') {
      requireAdmin(req);
      const body = await readJson(req);
      const lat = Number(body.lat);
      const lon = Number(body.lon);
      const accepts = Array.isArray(body.accepts) ? body.accepts.filter((a) => WASTE_TYPES.includes(a)) : [];
      if (body.lat == null || body.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        throw new HttpError(400, 'A valid location is required.');
      }
      if (!accepts.length) throw new HttpError(400, 'Choose at least one waste type.');
      const facility = await store.addFacility({ name: shortText(body.name, 'Name'), accepts, lat, lon, radiusM: 400 });
      return sendJson(res, 201, { facility });
    }

    const facilityStatus = pathname.match(/^\/api\/facilities\/([\w-]+)\/status$/);
    if (facilityStatus) {
      requireAdmin(req);
      const facility = await store.setFacilityOpen(facilityStatus[1], (await readJson(req)).open === true);
      if (!facility) throw new HttpError(404, 'This collection point does not exist.');
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
    if (res.headersSent) return res.destroy();
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    console.error(`${req.method} ${req.url} failed: ${err.message}`);
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

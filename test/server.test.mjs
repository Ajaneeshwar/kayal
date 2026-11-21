import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Store } from '../lib/store.mjs';

async function startServer(t, populate = async () => {}, { env = {}, preload } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'kayal-server-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'db.json'), JSON.stringify({ boats: [], facilities: [], entries: [], reports: [] }));
  await populate(await Store.open(dir));
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const args = preload ? ['--import', 'data:text/javascript,' + encodeURIComponent(preload)] : [];
  const child = spawn(process.execPath, [...args, 'server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, ...env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  });
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited with ${code}`)));
    child.stdout.on('data', (data) => {
      if (data.toString().includes('Kayal Log is running')) resolve();
    });
  });
  return `http://127.0.0.1:${port}`;
}

const reminderEnv = {
  ADMIN_PIN: 'test-pin',
  SAMVAAD_API_KEY: 'test-key',
  SAMVAAD_ORG_ID: 'test-org',
  SAMVAAD_WORKSPACE_ID: 'test-workspace',
  SAMVAAD_APP_ID: 'test-app',
  SAMVAAD_APP_VERSION: '6',
  SAMVAAD_CONNECTION_ID: 'test-connection',
  SAMVAAD_AGENT_NUMBER: '+919000000013',
  REMINDER_CALL_TO: '+919000000012',
  REMINDER_OWNER_NAME: 'Test owner',
};

async function reminderServer(t, env, preload) {
  return startServer(t, async (store) => {
    await store.addBoat({ name: 'Test Boat', registration: 'TEST-REMINDER' });
    await store.addBoat({ name: 'Other Boat', registration: 'TEST-OTHER' });
  }, { env: { ...reminderEnv, ...env }, preload });
}

function requestReminder(url, boatId, body = {}, pin = reminderEnv.ADMIN_PIN) {
  return fetch(`${url}/api/boats/${boatId}/reminder-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
    body: JSON.stringify(body),
  });
}

test('reminder guards reject unauthorized, invalid, unknown and unconfigured requests', async (t) => {
  const url = await reminderServer(t, { SAMVAAD_API_KEY: '' }, 'globalThis.fetch = () => process.exit(1);');
  const { boats: [boat] } = await (await fetch(url + '/api/state')).json();
  assert.equal((await requestReminder(url, boat.id, {}, 'wrong')).status, 401);
  assert.equal((await requestReminder(url, boat.id, { language: null })).status, 400);
  assert.equal((await requestReminder(url, 'unknown-boat')).status, 404);
  assert.equal((await requestReminder(url, boat.id)).status, 503);
});

test('reminders use the allowlist and block concurrent calls across boats', async (t) => {
  const url = await reminderServer(t, {}, `
    let sent = false;
    globalThis.fetch = async (url, init) => {
      const payload = JSON.parse(init.body);
      if (sent || !url.startsWith('https://apps.sarvam.ai/api/outbounds/v1/')
        || payload.user_config.user_phone_number !== process.env.REMINDER_CALL_TO
        || payload.app_config.app_overrides.initial_language_name !== 'English') process.exit(1);
      sent = true;
      return Response.json({ attempt_id: 'test-attempt' });
    };
  `);
  const { boats: [boat, other] } = await (await fetch(url + '/api/state')).json();
  const results = await Promise.all([boat, other].map(({ id }) =>
    requestReminder(url, id, { language: 'English', to: '+919000000099' })));
  assert.deepEqual(results.map((r) => r.status).sort(), [202, 429]);
  const limited = results.find((r) => r.status === 429);
  const { retryAfterSeconds } = await limited.json();
  assert.ok(retryAfterSeconds > 0 && retryAfterSeconds <= 60);
  assert.equal(limited.headers.get('retry-after'), String(retryAfterSeconds));
  const { attemptId, to, message } = await results.find((r) => r.status === 202).json();
  assert.equal(attemptId, 'test-attempt');
  assert.equal(to, '+91••••••12');
  assert.equal(message.local, message.english);
  const { reminderCalls } = await (await fetch(url + '/api/state')).json();
  assert.equal(reminderCalls.length, 1);
  assert.equal(reminderCalls[0].attemptId, attemptId);
  assert.equal(reminderCalls[0].to, to);
});

test('state weekly count is zero for an empty store', async (t) => {
  const url = await startServer(t);
  const res = await fetch(`${url}/api/state`);
  assert.equal(res.status, 200);
  const state = await res.json();
  assert.equal(state.weeklyEntryCount, 0);
  assert.deepEqual(state.entries, []);
});

test('state weekly count exceeds the feed cap and excludes old, future and correction records', async (t) => {
  const url = await startServer(t, async (store) => {
    const now = new Date();
    const draft = { boatId: 'test', kind: 'solid_waste', quantity: '1 bag', at: now.toISOString() };
    let entry;
    for (let i = 0; i < 105; i++) entry = await store.addEntry(draft);
    await store.addEntry({ ...draft, at: new Date(now.getTime() - 8 * 86400000).toISOString() });
    await store.addEntry({ ...draft, at: new Date(now.getTime() + 86400000).toISOString() });
    await store.addEntry({ boatId: 'test', at: draft.at, correctsEntryId: entry.id, quantity: '2 bags' });
  });
  const state = await (await fetch(`${url}/api/state`)).json();
  assert.equal(state.entries.length, 100);
  assert.equal(state.weeklyEntryCount, 105);
});

test('SPA pages retain HTTP status and missing files stay JSON', {
  skip: !existsSync(new URL('../web/dist/index.html', import.meta.url)) && 'Build web/ first to test SPA responses',
}, async (t) => {
  const url = await startServer(t);
  for (const pathname of ['/', '/crew', '/dashboard', '/boat/test', '/boat/test/sticker']) {
    const res = await fetch(`${url}${pathname}`, { headers: { accept: 'text/html' } });
    assert.equal(res.status, 200, pathname);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
  for (const pathname of ['/foo', '/boat/x/y']) {
    const res = await fetch(`${url}${pathname}`, { headers: { accept: 'text/html' } });
    assert.equal(res.status, 404, pathname);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /<html/);
  }
  for (const pathname of ['/assets/x.js', '/missing.png', '/api/missing', '/api']) {
    const res = await fetch(`${url}${pathname}`, { headers: { accept: 'text/html' } });
    assert.equal(res.status, 404, pathname);
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  }
  const res = await fetch(`${url}/foo`, { headers: { accept: 'application/json' } });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
});

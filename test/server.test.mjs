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

async function startServer(t, populate = async () => {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'kayal-server-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'db.json'), JSON.stringify({ boats: [], facilities: [], entries: [], reports: [] }));
  await populate(await Store.open(dir));
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir },
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
  for (const pathname of ['/', '/crew', '/dashboard', '/boat/test']) {
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

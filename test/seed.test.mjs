import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { seed } from '../lib/seed.mjs';
import { Store } from '../lib/store.mjs';
import { checkChain } from '../lib/logic.mjs';

test('service-boat samples use mobile-pump handovers in an intact chain', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kayal-seed-'));
  try {
    const store = await Store.open(dir, seed);
    const entries = store.entries.filter((e) => e.facilityMentioned === 'a service boat on Vembanad Lake');
    assert.equal(entries.length, 3);
    for (const entry of entries) {
      assert.equal(entry.method, 'mobile_pump');
      assert.equal(entry.verification.reason, 'no_fixed_point');
      assert.equal(store.entriesFor(entry.boatId).find((e) => e.id === entry.id).method, 'mobile_pump');
    }
    assert.equal(checkChain(store.entries).ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

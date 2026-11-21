import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENESIS_HASH, answerQuestion, boatStatus, checkChain, classifyByKeywords, compass, distanceM, entryHash,
  hasInvalidQuantity, hasWasteContext, normaliseExtraction, parseModelJson, projectEntries, replyFor, spokenDistance, verify,
} from '../lib/logic.mjs';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-11-21T12:00:00.000Z');
const KUMARAKOM = { id: 'k', name: 'Kumarakom STP', accepts: ['sewage'], lat: 9.5965, lon: 76.4292, radiusM: 400, open: true };
const H_BLOCK = { id: 'h', name: 'H Block STP', accepts: ['sewage'], lat: 9.4753, lon: 76.4499, radiusM: 400, open: false };
const PUNNAMADA = { id: 'p', name: 'Punnamada point', accepts: ['solid'], lat: 9.5223, lon: 76.3536, radiusM: 400, open: true };
const FACILITIES = [KUMARAKOM, H_BLOCK, PUNNAMADA];

const sewage = (daysAgo, level) => ({
  kind: 'sewage_pumpout',
  at: new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString(),
  verification: { level, facilityName: 'Kumarakom STP', reason: level === 'declared' ? 'no_location' : null },
});

test('distance between Alappuzha jetty and Kumarakom jetty is about 14 km', () => {
  const d = distanceM({ lat: 9.5008, lon: 76.3441 }, KUMARAKOM);
  assert.ok(d > 13_500 && d < 14_500, `got ${d}`);
});

test('compass points from Alappuzha to Kumarakom as north-east', () => {
  assert.equal(compass({ lat: 9.5008, lon: 76.3441 }, KUMARAKOM), 'north-east');
});

test('spoken distance switches from metres to kilometres', () => {
  assert.equal(spokenDistance(143), '140 metres');
  assert.equal(spokenDistance(949), '950 metres');
  assert.equal(spokenDistance(13_940), '13.9 kilometres');
});

test('verify: no location is self-declared', () => {
  const v = verify({ kind: 'sewage_pumpout', location: null, facilities: FACILITIES, hasReceipt: true });
  assert.deepEqual([v.level, v.reason], ['declared', 'no_location']);
});

test('verify: inside an open plant is location verified, and a receipt raises it', () => {
  const location = { lat: 9.5966, lon: 76.4293 };
  assert.equal(verify({ kind: 'sewage_pumpout', location, facilities: FACILITIES, hasReceipt: false }).level, 'location');
  const withReceipt = verify({ kind: 'sewage_pumpout', location, facilities: FACILITIES, hasReceipt: true });
  assert.deepEqual([withReceipt.level, withReceipt.facilityId, withReceipt.reason], ['receipt', 'k', null]);
});

test('verify: far from every plant is self-declared with the nearest plant named', () => {
  const v = verify({ kind: 'sewage_pumpout', location: { lat: 9.5008, lon: 76.3441 }, facilities: FACILITIES, hasReceipt: true });
  assert.deepEqual([v.level, v.reason, v.facilityId], ['declared', 'too_far', 'k']);
  assert.ok(v.distanceM > 400);
});

test('verify: a closed plant does not verify', () => {
  const v = verify({ kind: 'sewage_pumpout', location: { lat: 9.4753, lon: 76.4499 }, facilities: FACILITIES, hasReceipt: false });
  assert.deepEqual([v.level, v.reason, v.facilityId], ['declared', 'closed', 'h']);
});

test('verify: an open point in range wins over a closer closed one', () => {
  const barge = { ...H_BLOCK, id: 'barge', name: 'Barge', lat: 9.4760, open: true };
  const v = verify({ kind: 'sewage_pumpout', location: { lat: 9.4753, lon: 76.4499 }, facilities: [H_BLOCK, barge], hasReceipt: false });
  assert.deepEqual([v.level, v.facilityId], ['location', 'barge']);
});

test('verify: a sewage plant does not verify solid waste', () => {
  const v = verify({ kind: 'solid_waste', location: { lat: 9.5965, lon: 76.4292 }, facilities: FACILITIES, hasReceipt: false });
  assert.deepEqual([v.level, v.reason, v.facilityId], ['declared', 'too_far', 'p']);
});

test('verify: a kind nobody accepts has no facility', () => {
  const v = verify({ kind: 'engine_oil', location: { lat: 9.5, lon: 76.4 }, facilities: FACILITIES, hasReceipt: false });
  assert.equal(v.reason, 'no_facility');
});

test('boat status: verified pump-out inside the window', () => {
  const s = boatStatus([sewage(40, 'declared'), sewage(12, 'receipt')], NOW, 90);
  assert.deepEqual([s.state, s.lastSewage.daysAgo, s.lastSewage.level], ['verified', 12, 'receipt']);
});

test('boat status: an older verified pump-out still counts over a newer declared one', () => {
  const s = boatStatus([sewage(60, 'location'), sewage(5, 'declared')], NOW, 90);
  assert.deepEqual([s.state, s.lastSewage.daysAgo], ['verified', 60]);
});

test('boat status: only declared pump-outs inside the window', () => {
  const s = boatStatus([sewage(35, 'declared')], NOW, 90);
  assert.deepEqual([s.state, s.lastSewage.facilityName], ['declared', null]);
});

test('boat status: overdue when the last pump-out is outside the window or missing', () => {
  assert.equal(boatStatus([sewage(130, 'location')], NOW, 90).state, 'overdue');
  const empty = boatStatus([], NOW, 90);
  assert.deepEqual([empty.state, empty.lastSewage, empty.lastSolid], ['overdue', null, null]);
});

test('replies name the plant, the distance or the missing location', () => {
  const at = verify({ kind: 'sewage_pumpout', location: { lat: 9.5965, lon: 76.4292 }, facilities: FACILITIES, hasReceipt: true });
  assert.equal(
    replyFor({ kind: 'sewage_pumpout', verification: at, hasPhoto: true }),
    'Saved. Toilet tank emptying recorded at Kumarakom STP. Your location is confirmed. The receipt photo is saved.',
  );
  const far = verify({ kind: 'sewage_pumpout', location: { lat: 9.5008, lon: 76.3441 }, facilities: FACILITIES, hasReceipt: false });
  assert.equal(
    replyFor({ kind: 'sewage_pumpout', verification: far, hasPhoto: true }),
    'Saved, but not confirmed. You are 14.2 kilometres from the nearest sewage collection point, Kumarakom STP. The photo is saved.',
  );
  const none = verify({ kind: 'solid_waste', location: null, facilities: FACILITIES, hasReceipt: false });
  assert.equal(
    replyFor({ kind: 'solid_waste', verification: none, hasPhoto: false }),
    'Saved, but not confirmed. Turn on location at the collection point next time.',
  );
});

test('questions are answered from the open facilities', () => {
  assert.equal(
    answerQuestion('Where is the nearest working plant?', { lat: 9.5008, lon: 76.3441 }, FACILITIES),
    'The nearest working sewage collection point is Kumarakom STP, 14.2 kilometres to the north-east.',
  );
  assert.match(answerQuestion('Where can I give plastic?', null, FACILITIES), /^Working now: Punnamada point\./);
  assert.equal(answerQuestion('Where can I give used oil?', null, FACILITIES), 'No oil collection point is working right now.');
});

test('keyword fallback sorts common phrases', () => {
  assert.equal(classifyByKeywords('We emptied the toilet tank at Kumarakom'), 'sewage_pumpout');
  assert.equal(classifyByKeywords('Handed over four bags of plastic'), 'solid_waste');
  assert.equal(classifyByKeywords('Gave the used engine oil to the workshop'), 'engine_oil');
  assert.equal(classifyByKeywords('Which plant is open today'), 'question');
  assert.equal(classifyByKeywords('Good morning everyone'), 'other');
});

test('waste context rejects unrelated questions and keeps collection questions', () => {
  assert.equal(hasWasteContext('Hello, how are you?'), false);
  assert.equal(hasWasteContext('Where did I put my keys?'), false);
  assert.equal(hasWasteContext('Which plant is open today?'), true);
  assert.equal(hasWasteContext('We emptied the toilet tank at Kumarakom.'), true);
});

test('invalid quantities include non-finite and negative amounts', () => {
  assert.equal(hasInvalidQuantity('We emptied -8 litres.'), true);
  assert.equal(hasInvalidQuantity('We emptied −൮ litres.'), true);
  assert.equal(hasInvalidQuantity('NaN litres'), true);
  assert.equal(hasInvalidQuantity('800 litres'), false);
});

test('model JSON is read through code fences and bad kinds fall back', () => {
  const raw = parseModelJson('```json\n{"kind":"sewage_pumpout","quantity":"800 litres","facility_mentioned":null,"summary_en":"Emptied tank."}\n```');
  assert.deepEqual(normaliseExtraction(raw, 'x'), {
    kind: 'sewage_pumpout', facilityMentioned: null, quantity: '800 litres', summaryEn: 'Emptied tank.',
  });
  assert.equal(normaliseExtraction({ kind: 'party' }, 'we gave plastic bottles').kind, 'solid_waste');
  assert.throws(() => parseModelJson('no json here'));
});

test('hash chain detects an edited entry', () => {
  const entries = [];
  let prev = GENESIS_HASH;
  for (const id of ['a', 'b', 'c']) {
    const entry = { ...sewage(1, 'location'), id, boatId: 'x', summaryEn: id, quantity: null, heard: {}, location: null, photo: null, source: 'text', prevHash: prev };
    entry.hash = entryHash(prev, entry);
    entries.push(entry);
    prev = entry.hash;
  }
  assert.deepEqual(checkChain(entries), { ok: true, count: 3, brokenAt: null });
  entries[1].verification = { ...entries[1].verification, level: 'receipt' };
  assert.deepEqual(checkChain(entries), { ok: false, count: 3, brokenAt: 1 });
});

test('quantity corrections are chained and project the latest amount without changing proof', () => {
  const original = {
    ...sewage(1, 'location'), id: 'entry', boatId: 'boat', quantity: '8 litres',
    correctionTokenHash: 'private', prevHash: GENESIS_HASH,
  };
  original.hash = entryHash(original.prevHash, original);
  const first = {
    id: 'correction-1', boatId: original.boatId, correctsEntryId: original.id,
    at: NOW.toISOString(), quantity: '80 litres', prevHash: original.hash,
  };
  first.hash = entryHash(first.prevHash, first);
  const last = { ...first, id: 'correction-2', quantity: '8000 litres', prevHash: first.hash };
  last.hash = entryHash(last.prevHash, last);
  const records = [original, first, last];

  const [entry, ...extra] = projectEntries(records);
  assert.deepEqual(extra, []);
  assert.equal(entry.quantity, '8000 litres');
  assert.equal(entry.corrected, true);
  assert.equal(entry.correctionId, last.id);
  assert.equal(entry.correctionTokenHash, undefined);
  assert.equal(original.quantity, '8 litres');
  assert.deepEqual(entry.verification, original.verification);
  assert.deepEqual(checkChain(records), { ok: true, count: 3, brokenAt: null });
  assert.equal(checkChain([original, first, { ...last, quantity: '800 litres' }]).brokenAt, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENESIS_HASH, answerQuestion, boatStatus, checkChain, chooseReplyLanguage, classifyByKeywords, compass, distanceM, entryHash,
  hasInvalidQuantity, normaliseExtraction, parseModelJson, projectEntries, reminderMessage, replyFor, spokenDistance, verify,
} from '../lib/logic.mjs';
import { SPEECH_LANGUAGES } from '../lib/sarvam.mjs';

test('reminders use the pump-out record, rule window and first open sewage plant', () => {
  const now = new Date('2026-11-22T00:00:00Z');
  const facilities = [
    { name: 'Closed Plant', open: false, accepts: ['sewage'] },
    { name: 'Oil Point', open: true, accepts: ['oil'] },
    { name: 'First Plant', open: true, accepts: ['sewage'] },
    { name: 'Second Plant', open: true, accepts: ['sewage'] },
  ];
  const build = (at, points = facilities, overdueDays = 90) => {
    const entries = at ? [{
      kind: 'sewage_pumpout', at, verification: { level: 'receipt', reason: null },
    }] : [];
    return reminderMessage('Punnamada Star', 'Ajay', boatStatus(entries, now, overdueDays), points, now);
  };

  const due = build('2026-09-03T00:00:00Z');
  assert.match(due.english, /Punnamada Star's 90-day sewage pump-out record expires in 10 days \(2 December 2026\)/);
  assert.match(due.english, /at First Plant or another approved plant/);
  assert.equal(due.notDueSoon, false);

  const late = build('2026-07-28T12:00:00Z');
  assert.match(late.english, /is 27 days overdue/);
  assert.equal(late.notDueSoon, false);

  const noRecord = build(null, facilities.slice(0, 2));
  assert.match(noRecord.english, /Punnamada Star has no sewage pump-out on record/);
  assert.match(noRecord.english, /at an approved treatment plant/);
  assert.equal(noRecord.notDueSoon, false);

  const later = build('2026-09-17T00:00:00Z', facilities, 80);
  assert.match(later.english, /80-day sewage pump-out record expires in 14 days/);
  assert.equal(later.notDueSoon, false);
  assert.equal(build('2026-09-17T00:00:01Z', facilities, 80).notDueSoon, true);
});

test('auto replies in the detected language when Bulbul supports it', () => {
  for (const language of SPEECH_LANGUAGES) {
    assert.equal(chooseReplyLanguage('auto', language, SPEECH_LANGUAGES), language);
  }
});

test('auto replies in English when detection is missing or unsupported', () => {
  for (const detected of [null, undefined, 'as-IN']) {
    assert.equal(chooseReplyLanguage('auto', detected, SPEECH_LANGUAGES), 'en-IN');
  }
});

test('an explicit reply language overrides detection', () => {
  for (const language of ['ml-IN', 'en-IN', 'ta-IN']) {
    assert.equal(chooseReplyLanguage(language, 'hi-IN', SPEECH_LANGUAGES), language);
  }
});

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

test('handover proof skips facility matching and allows slips except for waste bins', () => {
  const noMatch = { facilityId: null, facilityName: null, distanceM: null };
  for (const method of ['suction_truck', 'mobile_pump', 'waste_collector', 'waste_bin']) {
    for (const location of [null, KUMARAKOM, { lat: 9.5, lon: 76.4 }]) {
      for (const hasReceipt of [false, true]) {
        const kind = method.startsWith('waste_') ? 'solid_waste' : 'sewage_pumpout';
        const verification = verify({ kind, method, location, facilities: FACILITIES, hasReceipt });
        const receipt = hasReceipt && method !== 'waste_bin';
        assert.deepEqual(verification, {
          ...noMatch,
          level: receipt ? 'receipt' : 'declared',
          reason: method === 'waste_bin' ? 'waste_bin' : receipt ? 'handover_slip' : 'no_fixed_point',
        });
      }
    }
  }
});

test('truck pump-outs count toward sewage status at their earned level', () => {
  for (const hasReceipt of [false, true]) {
    const kind = 'sewage_pumpout';
    const method = 'suction_truck';
    const verification = verify({ kind, method, hasReceipt });
    const status = boatStatus([{ ...sewage(10, verification.level), method, verification }], NOW, 90);
    assert.equal(status.state, hasReceipt ? 'verified' : 'declared');
    assert.equal(status.lastSewage.level, verification.level);
    assert.equal(status.lastSewage.facilityName, null);
    assert.match(replyFor({ kind, method, vehicleNumber: 'KL-04-AB-1234', verification }),
      /^This handover is now in the logbook\. Toilet tank emptied by suction truck KL-04-AB-1234\./);
  }
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

test('boat status ignores voided entries for both sewage and solid waste', () => {
  const voided = { ...sewage(1, 'receipt'), voided: true };
  const entries = [voided, { ...voided, kind: 'solid_waste' }];
  assert.deepEqual(boatStatus(entries, NOW, 90), boatStatus([], NOW, 90));
  assert.equal(boatStatus([...entries, sewage(30, 'declared')], NOW, 90).state, 'declared');
});

test('replies name the plant, the distance or the missing location', () => {
  const at = verify({ kind: 'sewage_pumpout', location: { lat: 9.5965, lon: 76.4292 }, facilities: FACILITIES, hasReceipt: true });
  assert.equal(
    replyFor({ kind: 'sewage_pumpout', verification: at, hasPhoto: true }),
    'This handover is now in the logbook. Toilet tank emptying recorded at Kumarakom STP. Your location is confirmed. The receipt photo is saved.',
  );
  const far = verify({ kind: 'sewage_pumpout', location: { lat: 9.5008, lon: 76.3441 }, facilities: FACILITIES, hasReceipt: false });
  assert.equal(
    replyFor({ kind: 'sewage_pumpout', verification: far, hasPhoto: true }),
    'This handover is in the logbook. We could not confirm it. You are 14.2 kilometres from the nearest sewage collection point, Kumarakom STP. The photo is saved.',
  );
  const none = verify({ kind: 'solid_waste', location: null, facilities: FACILITIES, hasReceipt: false });
  assert.equal(
    replyFor({ kind: 'solid_waste', verification: none, hasPhoto: false }),
    'This handover is in the logbook. We could not confirm it. Turn on location at the collection point next time.',
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

test('crew already at the dry-waste point get its name without a fictitious bearing', () => {
  assert.equal(answerQuestion('Where do we take dry waste?', PUNNAMADA, FACILITIES),
    'You are at Punnamada point, a working waste collection point.');
  assert.equal(classifyByKeywords('We gave our dry waste to the collector.'), 'solid_waste');
});

test('invalid quantities include non-finite and negative amounts', () => {
  assert.equal(hasInvalidQuantity('We emptied -8 litres.'), true);
  assert.equal(hasInvalidQuantity('We emptied -.5 litres.'), true);
  assert.equal(hasInvalidQuantity('We emptied 0.5 litres.'), false);
  assert.equal(hasInvalidQuantity('We emptied −൮ litres.'), true);
  assert.equal(hasInvalidQuantity('NaN litres'), true);
  assert.equal(hasInvalidQuantity('800 litres'), false);
  assert.equal(hasInvalidQuantity('Septic truck KL-04-AB-1234 took 300 litres.'), false);
});

test('model JSON is read through code fences and bad kinds fall back', () => {
  const raw = parseModelJson('```json\n{"kind":"sewage_pumpout","quantity":"800 litres","facility_mentioned":null,"summary_en":"Emptied tank."}\n```');
  assert.deepEqual(normaliseExtraction(raw, 'x'), {
    kind: 'sewage_pumpout', method: 'collection_point', vehicleNumber: null, handedTo: null,
    facilityMentioned: null, quantity: '800 litres', summaryEn: 'Emptied tank.',
  });
  assert.equal(normaliseExtraction({ kind: 'party' }, 'we gave plastic bottles').kind, 'solid_waste');
  assert.throws(() => parseModelJson('no json here'));
});

test('handover extraction validates methods and caps optional strings', () => {
  for (const method of ['__proto__', 'paper boat', ['suction_truck'], {}, null, 42]) {
    const entry = normaliseExtraction({ method, vehicle_number: {}, handed_to: 42 }, 'We gave dry waste');
    assert.deepEqual([entry.method, entry.vehicleNumber, entry.handedTo], ['collection_point', null, null]);
  }
  const entry = normaliseExtraction({
    method: 'suction_truck', vehicle_number: ` < ${'A'.repeat(50)} > `, handed_to: 'Ravi ' + 'b'.repeat(110),
  }, 'Septic truck took 300 litres');
  assert.deepEqual([entry.method, entry.vehicleNumber, entry.handedTo],
    ['suction_truck', 'A'.repeat(40), 'Ravi ' + 'b'.repeat(95)]);
});

test('public handover summaries use emptying or handover wording', () => {
  for (const verb of ['Dumped', 'Discharged', 'Thrown', 'Disposed of', 'Discarded']) {
    const entry = normaliseExtraction({ kind: 'sewage_pumpout', summary_en: verb + ' the contents at Kumarakom.' }, '');
    assert.equal(entry.summaryEn, 'Emptied the contents at Kumarakom.');
  }
  const fallback = normaliseExtraction(null, 'We threw away the plastic.');
  assert.equal(fallback.summaryEn, 'We handed over the plastic.');
  const bareVerb = normaliseExtraction({ kind: 'sewage_pumpout', summary_en: 'emptied' }, 'We dumped the tank contents at Kumarakom.');
  assert.equal(bareVerb.summaryEn, 'We emptied the tank contents at Kumarakom.');
  const named = normaliseExtraction({ kind: 'engine_oil', summary_en: 'Handed over oil to Ravi.' }, '');
  assert.equal(named.summaryEn, 'Handed over oil to Ravi.');
});

test('handed-to only retains plausible recipient names', () => {
  for (const handed_to of ['Al', 'TEST', 'TEST-1', 'KL-04-AB-1234', 'kl 04 Ab 1234',
    '1234', '1,000', 'truck', 'boat', 'the driver', 'someone', 'suction truck']) {
    assert.equal(normaliseExtraction({ handed_to }, '').handedTo, null, handed_to);
  }
  for (const handed_to of ['Ravi', 'Haritha Karma Sena', 'Ravi from HKS', 'രവി']) {
    assert.equal(normaliseExtraction({ handed_to }, '').handedTo, handed_to);
  }
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

test('void records are chained and mark the original entry in public projections', () => {
  const original = { ...sewage(1, 'location'), id: 'entry', boatId: 'boat', prevHash: GENESIS_HASH };
  original.hash = entryHash(original.prevHash, original);
  const marker = {
    id: 'void-1', boatId: original.boatId, at: NOW.toISOString(),
    voidsEntryId: original.id, reason: 'Test entry', prevHash: original.hash,
  };
  marker.hash = entryHash(marker.prevHash, marker);
  const records = [original, marker];
  assert.deepEqual(checkChain(records), { ok: true, count: 2, brokenAt: null });
  for (const change of [{ reason: 'Edited' }, { voidsEntryId: 'another-entry' }]) {
    assert.equal(checkChain([original, { ...marker, ...change }]).brokenAt, 1);
  }
  assert.equal(projectEntries([original])[0].voided, false);
  const [entry, ...extra] = projectEntries(records);
  assert.deepEqual(extra, []);
  assert.deepEqual(entry, {
    ...projectEntries([original])[0], voided: true, voidedAt: marker.at, voidReason: marker.reason,
  });
});

test('new entries bind the named plant and receipt fields alongside legacy hashes', () => {
  const legacy = { id: 'old', boatId: 'boat', prevHash: GENESIS_HASH };
  // Digest produced by the original writer, before versioned hashes.
  legacy.hash = '56b07de3fd48f40772866f3bec3d077a349ad3c45fc370a4f0745179f164fa40';
  const entry = {
    id: 'new', boatId: 'boat', hashVersion: 2, prevHash: legacy.hash,
    facilityMentioned: 'Kumarakom STP', photo: { file: 'test.jpg', isReceipt: true },
  };
  entry.hash = entryHash(entry.prevHash, entry);
  assert.equal(checkChain([legacy, entry]).ok, true);
  assert.equal(checkChain([legacy, { ...entry, facilityMentioned: 'Another plant' }]).brokenAt, 1);
  assert.equal(checkChain([legacy, { ...entry, photo: { ...entry.photo, isReceipt: false } }]).brokenAt, 1);
  assert.equal(Object.hasOwn(projectEntries([entry])[0], 'hashVersion'), false);
  assert.equal(projectEntries([legacy])[0].method, 'collection_point');
  assert.equal(Object.hasOwn(legacy, 'method'), false);

  const handover = {
    ...entry, id: 'handover', prevHash: entry.hash, hashVersion: 3, method: 'suction_truck',
    vehicleNumber: 'KL-04-AB-1234', handedTo: 'Municipality',
  };
  handover.hash = entryHash(handover.prevHash, handover);
  assert.equal(checkChain([legacy, entry, handover]).ok, true);
  for (const field of ['method', 'vehicleNumber', 'handedTo']) {
    assert.equal(checkChain([legacy, entry, { ...handover, [field]: 'edited' }]).brokenAt, 2);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyConfirmation, canConfirm, confirmationHashFields, custodyTotals, litresFromQuantity, VEHICLE_UNLOAD } from '../lib/confirm.mjs';
import { boatStatus, checkChain, entryHash, GENESIS_HASH, projectEntries } from '../lib/logic.mjs';

const now = new Date('2026-11-22T00:00:00Z');
const plant = { id: 'desk', name: 'Plant desk', type: 'plant', facilityId: 'kumarakom-stp', vehicleNumber: null };
const truck = { id: 'truck', name: 'Suction service', type: 'suction_truck', facilityId: null, vehicleNumber: 'KL-04-AB-1234' };
const pump = { id: 'pump', name: 'Service boat', type: 'mobile_pump', facilityId: null, vehicleNumber: 'KL-04-PB-0007' };
const collector = { id: 'collector', name: 'Waste collector', type: 'waste_collector', facilityId: null, vehicleNumber: null };
const handover = {
  id: 'handover', boatId: 'boat', kind: 'sewage_pumpout', at: '2026-11-21T00:00:00Z',
  verification: { level: 'receipt', facilityId: 'kumarakom-stp', reason: null }, vehicleNumber: null,
};
const received = {
  id: 'confirmation', at: now.toISOString(), confirmsEntryId: handover.id, boatId: handover.boatId,
  operatorId: truck.id, decision: 'received', quantity: '300 litres', note: null,
};
const unload = {
  type: VEHICLE_UNLOAD, id: 'unload', at: now.toISOString(), operatorId: plant.id,
  facilityId: plant.facilityId, vehicleNumber: truck.vehicleNumber, quantity: '100 litres',
};

test('plant and collector operators can only confirm their own handovers', () => {
  assert.equal(canConfirm(plant, handover, now), true);
  const facility = { id: plant.facilityId, name: 'Kumarakom STP' };
  const distant = { ...handover, verification: { ...handover.verification, reason: 'too_far' } };
  assert.equal(canConfirm(plant, distant, now, facility), false);
  assert.equal(canConfirm(plant, { ...distant, facilityMentioned: 'Kumarakom STP' }, now, facility), true);
  assert.equal(canConfirm({ ...plant, facilityId: 'another-plant' }, handover, now), false);
  assert.equal(canConfirm(plant, { ...handover, method: 'waste_collector' }, now), false);
  assert.equal(canConfirm(collector, { ...handover, method: 'waste_collector' }, now), true);
  assert.equal(canConfirm(collector, { ...handover, method: 'waste_bin' }, now), false);
});

test('truck and pump registrations match ignoring case, spaces and hyphens', () => {
  const pickup = { ...handover, method: 'suction_truck', vehicleNumber: ' kl 04-ab 1234 ' };
  assert.equal(canConfirm(truck, pickup, now), true);
  assert.equal(canConfirm(truck, { ...pickup, vehicleNumber: null }, now), true);
  assert.equal(canConfirm(truck, { ...pickup, vehicleNumber: 'KL-04-AB-1111' }, now), false);
  assert.equal(canConfirm(pump, { ...pickup, vehicleNumber: null }, now), false);
  assert.equal(canConfirm(pump, { ...pickup, method: 'mobile_pump', vehicleNumber: 'kl04pb0007' }, now), true);
});

test('the 72-hour window includes its boundary and excludes voided, future and invalid entries', () => {
  const at = '2026-11-19T00:00:00.000Z';
  assert.equal(canConfirm(plant, { ...handover, at }, now), true);
  assert.equal(canConfirm(plant, { ...handover, at: '2026-11-18T23:59:59.999Z' }, now), false);
  assert.equal(canConfirm(plant, { ...handover, at: '2026-11-22T00:00:00.001Z' }, now), false);
  assert.equal(canConfirm(plant, { ...handover, at: 'invalid' }, now), false);
  assert.equal(canConfirm(plant, { ...handover, voided: true }, now), false);
});

test('received upgrades every proof level and fills a missing registration', () => {
  for (const level of ['declared', 'location', 'receipt']) {
    const entry = { ...handover, verification: { ...handover.verification, level } };
    const projected = applyConfirmation(entry, received, truck);
    assert.equal(projected.verification.level, 'confirmed');
    assert.equal(projected.verification.reason, 'operator_confirmed');
    assert.equal(projected.vehicleNumber, truck.vehicleNumber);
    assert.equal(projected.disputed, false);
    assert.deepEqual(projected.confirmation, {
      decision: 'received', at: received.at, operatorId: truck.id, operatorName: truck.name,
      operatorType: truck.type, quantity: '300 litres', note: null,
    });
    assert.equal(entry.verification.level, level);
    assert.equal(entry.vehicleNumber, null);
  }
});

test('a dispute downgrades a receipt and an old entry retains its original proof', () => {
  const disputed = applyConfirmation(handover, { ...received, decision: 'not_received' }, truck);
  assert.equal(disputed.verification.level, 'declared');
  assert.equal(disputed.verification.reason, 'operator_disputed');
  assert.equal(disputed.disputed, true);
  assert.deepEqual(applyConfirmation(handover), { ...handover, confirmation: null, disputed: false });
});

test('confirmation hashing includes each persisted confirmation field', () => {
  assert.deepEqual(confirmationHashFields(received), [
    'operator_confirmation', 'confirmation', 'boat', now.toISOString(), 'handover',
    'truck', 'received', '300 litres', null,
  ]);
});

test('the chain covers confirmations and handover codes while status uses the projected proof', () => {
  const legacy = { ...handover, id: 'old', prevHash: GENESIS_HASH };
  legacy.hash = entryHash(legacy.prevHash, legacy);
  const pickup = {
    ...handover, method: 'suction_truck', handoverCode: 'KAYAL2', hashVersion: 4, prevHash: legacy.hash,
  };
  pickup.hash = entryHash(pickup.prevHash, pickup);
  const confirmation = { ...received, prevHash: pickup.hash };
  confirmation.hash = entryHash(confirmation.prevHash, confirmation);

  const records = [legacy, pickup, confirmation];
  assert.deepEqual(checkChain(records), { ok: true, count: 3, brokenAt: null });
  assert.equal(checkChain([legacy, { ...pickup, handoverCode: 'KAYAL3' }, confirmation]).brokenAt, 1);
  for (const [key, value] of Object.entries(confirmation)) {
    if (key === 'hash' || key === 'prevHash') continue;
    assert.equal(checkChain([legacy, pickup, { ...confirmation, [key]: `changed-${value}` }]).brokenAt, 2, key);
  }
  const [old, confirmed] = projectEntries(records, [truck]);
  assert.equal(old.handoverCode, null);
  assert.equal(old.verification.level, 'receipt');
  assert.equal(confirmed.id, pickup.id);
  assert.equal(boatStatus([confirmed], now, 90).lastSewage.level, 'confirmed');
  const [disputed] = projectEntries([pickup, { ...confirmation, decision: 'not_received' }], [truck]);
  assert.equal(boatStatus([disputed], now, 90).state, 'overdue');
  assert.equal(boatStatus([{ ...disputed, kind: 'solid_waste' }], now, 90).lastSolid, null);
});

test('unloads are hashed and omitted from public handover projections', () => {
  const pickup = { ...handover, prevHash: GENESIS_HASH };
  pickup.hash = entryHash(pickup.prevHash, pickup);
  const record = { ...unload, prevHash: pickup.hash };
  record.hash = entryHash(record.prevHash, record);
  assert.deepEqual(checkChain([pickup, record]), { ok: true, count: 2, brokenAt: null });
  assert.deepEqual(projectEntries([pickup, record]).map((entry) => entry.id), [pickup.id]);
  for (const [key, value] of Object.entries(unload)) {
    assert.equal(checkChain([pickup, { ...record, [key]: `changed-${value}` }]).brokenAt, 1, key);
  }
});

test('litre totals use validated quantities and skip unknown or missing units', () => {
  assert.equal(litresFromQuantity('1,200.5 L'), 1200.5);
  assert.equal(litresFromQuantity('൧൨ ലിറ്റർ'), 12);
  assert.equal(litresFromQuantity('4 Liters'), 4);
  for (const value of [null, '100', '100 bags', '-5 L', '1,20 L', 'Infinity L', {}]) {
    assert.equal(litresFromQuantity(value), 0);
  }
});

test('custody totals match normalized vehicles and use only the last 30 days of activity', () => {
  const boundary = '2026-10-23T00:00:00.000Z';
  const old = '2026-10-22T23:59:59.999Z';
  const future = '2026-11-22T00:00:00.001Z';
  const records = [
    { ...received, confirmsEntryId: 'old', at: old },
    { ...received, confirmsEntryId: 'boundary', quantity: '500 L', at: boundary },
    received,
    { ...received, confirmsEntryId: 'future', at: future },
    { ...received, confirmsEntryId: 'disputed', decision: 'not_received' },
    { ...received, confirmsEntryId: 'unknown-unit', quantity: '100 bags' },
    { ...received, confirmsEntryId: 'voided' },
    { voidsEntryId: 'voided', at: now.toISOString() },
    { ...received, confirmsEntryId: 'collector', operatorId: collector.id },
    { ...unload, vehicleNumber: 'kl04ab1234', quantity: '450 l' },
    { ...unload, at: old, quantity: '300 L' },
    { ...unload, at: future, quantity: '100 L' },
    { ...unload, vehicleNumber: 'kl 04 pb 0007', at: boundary, quantity: '1.5 litres' },
    { ...unload, vehicleNumber: 'KL-04-ZZ-0000' },
  ];
  assert.deepEqual(custodyTotals([plant, truck, pump, collector], records, now), [
    {
      vehicleNumber: truck.vehicleNumber, operatorName: truck.name, pickedUpLitres: 800,
      unloadedLitres: 450, gapLitres: 350, lastPickupAt: now.toISOString(), lastUnloadAt: now.toISOString(),
    },
    {
      vehicleNumber: pump.vehicleNumber, operatorName: pump.name, pickedUpLitres: 0,
      unloadedLitres: 1.5, gapLitres: -1.5, lastPickupAt: null, lastUnloadAt: boundary,
    },
  ]);
});

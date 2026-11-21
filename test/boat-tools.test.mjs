import test from 'node:test';
import assert from 'node:assert/strict';
import { boatsCsv, filterBoats } from '../web/src/lib/boatTools.ts';

const boats = [
  { name: 'Kayal Rani', registration: 'SAMPLE-01', status: { state: 'verified' } },
  { name: 'Punnamada Star', registration: 'SAMPLE-02', status: { state: 'overdue' } },
];

test('boat search trims, ignores case, matches names and registrations, and preserves order', () => {
  assert.deepEqual(filterBoats(boats, ' RANI '), [boats[0]]);
  assert.deepEqual(filterBoats(boats, 'sample-02'), [boats[1]]);
  assert.deepEqual(filterBoats(boats, '  '), boats);
  assert.deepEqual(filterBoats(boats, 'unknown'), []);
  assert.deepEqual(filterBoats([], ''), []);
  assert.deepEqual(filterBoats(boats, '', 'overdue'), [boats[1]]);
  assert.deepEqual(filterBoats(boats, 'Rani', 'overdue'), []);
  assert.deepEqual(boats.map((boat) => boat.name), ['Kayal Rani', 'Punnamada Star']);
});

test('CSV includes BOM, English headers, escaped Unicode fields and existing proof labels', () => {
  const csv = boatsCsv([{
    name: 'Boat, "special"\nΩ', registration: 'REG-1', status: {
      state: 'verified', lastSewage: { at: '2026-01-01T00:00:00Z', daysAgo: 0, level: 'location', facilityName: 'Jetty, east' },
      lastSolid: { at: '2026-01-02T00:00:00Z', daysAgo: 0, level: 'receipt', facilityName: 'Plant' },
    },
  }]);
  assert.ok(csv.startsWith('\uFEFF"Name","Registration","State","Days since sewage"'));
  assert.ok(csv.includes('"Boat, ""special""\nΩ"'));
  assert.ok(csv.includes('"Verified","0","2026-01-01T00:00:00Z","Location","Jetty, east"'));
  assert.ok(csv.includes('"Receipt","Plant"\r\n'));
  assert.equal(Buffer.from(csv).subarray(0, 3).toString('hex'), 'efbbbf');
});

test('CSV exports headers when empty, handles missing handovers and neutralizes spreadsheet formulas', () => {
  assert.equal(boatsCsv([]).trim().split('\r\n').length, 1);
  const csv = boatsCsv([{ name: '=SUM(1,2)', registration: '+123', status: { state: 'overdue', lastSewage: null, lastSolid: null } }]);
  assert.ok(csv.includes('"\'=SUM(1,2)","\'+123","Overdue","","","","","","",""\r\n'));
});

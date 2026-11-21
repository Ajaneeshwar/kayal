import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBoats } from '../web/src/lib/boatTools.ts';

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

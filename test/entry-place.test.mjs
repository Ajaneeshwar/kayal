import test from 'node:test';
import assert from 'node:assert/strict';
import { entryPlace } from '../web/src/pages/boat/entryPlace.ts';

const entry = {
  method: 'collection_point',
  facilityMentioned: 'Crew-named jetty',
  verification: { reason: null, facilityName: 'GPS candidate plant' },
};

test('entry place uses the GPS facility only for a matched collection point', () => {
  assert.equal(entryPlace(entry), 'GPS candidate plant');
  assert.equal(entryPlace({ ...entry, method: undefined }), 'GPS candidate plant');
  for (const reason of ['closed', 'too_far', 'no_location', 'no_facility']) {
    assert.equal(entryPlace({ ...entry, verification: { ...entry.verification, reason } }), 'Crew-named jetty');
  }
});

test('every off-site handover retains its named location without vehicle or recipient details', () => {
  for (const method of ['suction_truck', 'mobile_pump', 'waste_collector', 'waste_bin']) {
    assert.equal(entryPlace({ ...entry, method }), 'Crew-named jetty');
  }
});

test('entry place handles absent names without presenting an unmatched GPS candidate', () => {
  assert.equal(entryPlace({ ...entry, facilityMentioned: null, verification: { reason: 'closed', facilityName: 'GPS candidate plant' } }), null);
  assert.equal(entryPlace({ ...entry, verification: { reason: null, facilityName: null } }), 'Crew-named jetty');
  assert.equal(entryPlace({ ...entry, facilityMentioned: '', verification: { reason: null, facilityName: '' } }), null);
});

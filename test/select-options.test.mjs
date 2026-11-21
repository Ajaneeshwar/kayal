import test from 'node:test';
import assert from 'node:assert/strict';
import { findOption, stepOption } from '../web/src/components/selectOptions.ts';

const options = [{ label: 'Kayal Rani' }, { label: 'Kayal Queen', disabled: true }, { label: 'Punnamada Star' }, { label: 'Kayal Pearl' }];

test('select navigation skips disabled options and stops at the ends', () => {
  assert.equal(stepOption(options, -1, 1), 0);
  assert.equal(stepOption(options, options.length, -1), 3);
  assert.equal(stepOption(options, 0, 1), 2);
  assert.equal(stepOption(options, 2, -1), 0);
  assert.equal(stepOption(options, 0, -1), 0);
  assert.equal(stepOption(options, 3, 1), 3);
});

test('select type-ahead ignores case, skips disabled matches and wraps from the active option', () => {
  assert.equal(findOption(options, 'kaYal', 1), 3);
  assert.equal(findOption(options, 'K', 4), 0);
  assert.equal(findOption(options, 'pu', 0), 2);
  assert.equal(findOption([{ label: ' Élan' }], 'E\u0301'), 0);
});

test('empty, unavailable and unmatched select options have no navigable match', () => {
  assert.equal(stepOption([], -1, 1), -1);
  assert.equal(stepOption([{ label: 'Unavailable', disabled: true }], -1, 1), -1);
  assert.equal(findOption([], 'x'), -1);
  assert.equal(findOption(options, ''), -1);
  assert.equal(findOption(options, 'unknown'), -1);
});

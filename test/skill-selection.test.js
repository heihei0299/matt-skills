import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkillNames } from '../bin/skill-selection.js';

test('default selection uses the explicit default bundle and excludes repo-local skills', () => {
  const availableNames = [
    'zeta',
    'tdd-implement',
    'grilling',
    'ci-guard',
    'commit-check',
  ];

  assert.deepEqual(
    [...resolveSkillNames({
      availableNames,
      mode: 'default',
      defaults: ['zeta', 'missing-default', 'ci-guard'],
    })],
    ['zeta'],
  );
});

test('all selection includes available distributable skills and excludes repo-local skills', () => {
  assert.deepEqual(
    [...resolveSkillNames({
      availableNames: ['zeta', 'tdd-implement', 'ci-guard', 'commit-check', 'tdd-implement'],
      mode: 'all',
    })],
    ['tdd-implement', 'zeta'],
  );
});

test('selection is stable, deduplicated, and does not mutate inputs', () => {
  const availableNames = ['zeta', 'tdd-implement', 'zeta'];
  const defaults = ['zeta', 'tdd-implement', 'zeta'];

  assert.deepEqual(
    [...resolveSkillNames({ availableNames, mode: 'default', defaults })],
    ['tdd-implement', 'zeta'],
  );
  assert.deepEqual(availableNames, ['zeta', 'tdd-implement', 'zeta']);
  assert.deepEqual(defaults, ['zeta', 'tdd-implement', 'zeta']);
});

test('unknown default names do not enter the result', () => {
  assert.deepEqual(
    [...resolveSkillNames({
      availableNames: ['tdd-implement'],
      mode: 'default',
      defaults: ['unknown-default', 'tdd-implement'],
    })],
    ['tdd-implement'],
  );
});

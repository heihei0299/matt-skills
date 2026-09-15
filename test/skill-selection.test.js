import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkillNames } from '../bin/skill-selection.js';

test('default selection merges engineering, required, and default proprietary skills', () => {
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
      engineering: new Set(['zeta', 'missing-engineering']),
      required: new Set(['grilling', 'missing-required']),
    })],
    ['grilling', 'tdd-implement', 'zeta'],
  );
});

test('repo-local names stay excluded from default selection even when requested', () => {
  assert.deepEqual(
    [...resolveSkillNames({
      availableNames: ['tdd-implement', 'ci-guard', 'commit-check'],
      mode: 'default',
      engineering: ['ci-guard'],
      required: ['commit-check'],
    })],
    ['tdd-implement'],
  );
});

test('all selection includes available distributable skills and excludes repo-local skills', () => {
  assert.deepEqual(
    [...resolveSkillNames({
      availableNames: ['zeta', 'tdd-implement', 'ci-guard', 'commit-check', 'tdd-implement'],
      mode: 'all',
      engineering: [],
      required: [],
    })],
    ['tdd-implement', 'zeta'],
  );
});

test('selection is stable, deduplicated, and does not mutate inputs', () => {
  const availableNames = ['zeta', 'tdd-implement', 'zeta'];
  const engineering = ['zeta', 'tdd-implement', 'zeta'];
  const required = ['zeta'];

  assert.deepEqual(
    [...resolveSkillNames({ availableNames, mode: 'default', engineering, required })],
    ['tdd-implement', 'zeta'],
  );
  assert.deepEqual(availableNames, ['zeta', 'tdd-implement', 'zeta']);
  assert.deepEqual(engineering, ['zeta', 'tdd-implement', 'zeta']);
  assert.deepEqual(required, ['zeta']);
});

test('unknown engineering and required names do not enter the result', () => {
  assert.deepEqual(
    [...resolveSkillNames({
      availableNames: ['tdd-implement'],
      mode: 'default',
      engineering: ['unknown-engineering'],
      required: ['unknown-required'],
    })],
    ['tdd-implement'],
  );
});

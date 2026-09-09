import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROPRIETARY_SKILLS,
  DISTRIBUTABLE_PROPRIETARY_SKILLS,
  REPO_LOCAL_SKILLS,
  DEFAULT_PROPRIETARY_SKILLS,
  isDistributableSkill,
} from '../bin/skill-boundaries.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(path.join(ROOT, 'config/proprietary.json'), 'utf8'));

const EXPECTED = {
  all: [
    'ci-guard',
    'tdd-implement',
    'grill-to-spec',
    'diagnose-fix',
    'commit-check',
    'scaffold-functional-test',
    'show-me',
  ],
  distributable: [
    'tdd-implement',
    'diagnose-fix',
    'grill-to-spec',
    'scaffold-functional-test',
    'show-me',
  ],
  repoLocal: ['ci-guard', 'commit-check'],
  default: ['tdd-implement', 'diagnose-fix', 'grill-to-spec', 'show-me'],
};

test('proprietary config declares the four classification sets', () => {
  assert.deepEqual(config, EXPECTED);
});

test('proprietary classification sets are disjoint and complete', () => {
  const all = new Set(config.all);
  const distributable = new Set(config.distributable);
  const repoLocal = new Set(config.repoLocal);
  const defaults = new Set(config.default);

  assert.equal([...distributable].filter((name) => repoLocal.has(name)).length, 0);
  assert.deepEqual(new Set([...distributable, ...repoLocal]), all);
  assert.ok([...defaults].every((name) => distributable.has(name)));
});

test('classification helpers fail closed for unknown names and reject repo-local names', () => {
  assert.equal(PROPRIETARY_SKILLS.has('ci-guard'), true);
  assert.equal(DISTRIBUTABLE_PROPRIETARY_SKILLS.has('show-me'), true);
  assert.equal(REPO_LOCAL_SKILLS.has('commit-check'), true);
  assert.equal(DEFAULT_PROPRIETARY_SKILLS.has('commit-check'), false);
  assert.equal(isDistributableSkill('ci-guard', PROPRIETARY_SKILLS), false);
  assert.equal(isDistributableSkill('upstream-example', new Set(['upstream-example'])), true);
  assert.equal(isDistributableSkill('unknown', new Set()), false);
});

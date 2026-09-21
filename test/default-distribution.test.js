import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillNames } from '../bin/skill-selection.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_DEFAULTS = [
  'domain-modeling',
  'grill-with-docs',
  'grilling',
  'initialize-project',
  'setup-matt-pocock-skills',
  'to-spec',
  'to-tickets',
];

test('default distribution is the curated workflow closure', () => {
  const configured = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/default.json'), 'utf8'));
  assert.deepEqual([...configured].sort(), EXPECTED_DEFAULTS);

  const selected = resolveSkillNames({
    availableNames: [...configured, 'grill-me', 'diagnose-fix', 'show-me', 'ci-guard', 'commit-check'],
    mode: 'default',
    defaults: configured,
  });
  assert.deepEqual(selected, EXPECTED_DEFAULTS);
});

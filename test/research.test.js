import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = readFileSync(path.join(ROOT, '.agents/skills/research/SKILL.md'), 'utf8');

test('research delegates primary-source work and records cited findings', () => {
  assert.match(research, /background agent/i);
  assert.match(research, /primary sources/i);
  assert.match(research, /single Markdown file/i);
  assert.match(research, /citing each claim's source/i);
});

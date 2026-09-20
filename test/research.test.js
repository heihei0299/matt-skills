import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = readFileSync(path.join(ROOT, '.agents/skills/research/SKILL.md'), 'utf8');

test('research stages remote source ingestion', () => {
  assert.match(research, /discover|search/i);
  assert.match(research, /rank.*candidate/i);
  assert.match(research, /1.?2/);
  assert.match(research, /unresolved question|uncertainty/i);
  assert.match(research, /comprehensive|multi-source/i);
  assert.match(research, /no runtime|tool-call blocker/i);
});

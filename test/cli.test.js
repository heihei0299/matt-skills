import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

// Independent literal: the 24 skills shipped in this repo.
const SKILL_NAMES = [
  'ask-matt',
  'codebase-design',
  'code-review',
  'diagnosing-bugs',
  'domain-modeling',
  'grill-me',
  'grill-to-spec',
  'grill-with-docs',
  'grilling',
  'handoff',
  'implement',
  'improve-codebase-architecture',
  'prototype',
  'research',
  'resolving-merge-conflicts',
  'setup-matt-pocock-skills',
  'tdd',
  'tdd-implement',
  'teach',
  'to-spec',
  'to-tickets',
  'triage',
  'wayfinder',
  'writing-great-skills',
];

// Literal lines copied from the skills' SKILL.md frontmatter, including
// quoted, colon-containing, and non-ASCII descriptions.
const SAMPLE_LINES = [
  'tdd — Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.',
  'grill-to-spec — Router：编排 grill-with-docs → to-spec，只打磨设计与产出文档/spec，不写代码。',
  'resolving-merge-conflicts — Use when you need to resolve an in-progress git merge/rebase conflict.',
];

const TDD_DESCRIPTION =
  'Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.';

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('`list` exits 0 and prints all 24 skills with their names', () => {
  const { status, stdout, stderr } = runCli(['list']);
  assert.equal(status, 0, stderr);
  const lines = stdout.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, 24);
  const names = lines.map((line) => line.split(' — ')[0]);
  assert.deepEqual([...names].sort(), [...SKILL_NAMES].sort());
});

test('`list` prints each skill description from its frontmatter', () => {
  const { status, stdout, stderr } = runCli(['list']);
  assert.equal(status, 0, stderr);
  for (const line of SAMPLE_LINES) {
    assert.ok(stdout.includes(line), `missing line: ${line}`);
  }
});

test('`list --json` emits a JSON array with all 24 skills', () => {
  const { status, stdout, stderr } = runCli(['list', '--json']);
  assert.equal(status, 0, stderr);
  const skills = JSON.parse(stdout);
  assert.equal(skills.length, 24);
  assert.deepEqual(
    skills.map((s) => s.name).sort(),
    [...SKILL_NAMES].sort(),
  );
  assert.deepEqual(
    skills.find((s) => s.name === 'tdd'),
    { name: 'tdd', description: TDD_DESCRIPTION },
  );
});

test('`list` works from any working directory (temp dir)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-'));
  try {
    const { status, stdout, stderr } = runCli(['list'], tmp);
    assert.equal(status, 0, stderr);
    assert.equal(stdout.trim().split('\n').filter(Boolean).length, 24);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('no arguments prints help and exits 0', () => {
  const { status, stdout, stderr } = runCli([]);
  assert.equal(status, 0, stderr);
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /list/);
});

test('`--help` prints help and exits 0', () => {
  const { status, stdout, stderr } = runCli(['--help']);
  assert.equal(status, 0, stderr);
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /list/);
});

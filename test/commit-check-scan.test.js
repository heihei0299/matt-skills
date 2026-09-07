import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scan = path.join(repo, '.agents/skills/commit-check/scripts/scan-sensitive.sh');

function makeRepo() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'matt-skills-commit-check-'));
  execFileSync('git', ['init', '-q'], { cwd });
  return cwd;
}

function stage(cwd, file, content) {
  writeFileSync(path.join(cwd, file), content);
  execFileSync('git', ['add', file], { cwd });
}

function runScan(cwd, ...args) {
  return spawnSync('bash', [scan, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('scan passes a safe staged diff', () => {
  const cwd = makeRepo();
  try {
    stage(cwd, 'README.md', 'safe documentation\n');
    const result = runScan(cwd, '--staged-only');
    assert.equal(result.status, 0, output(result));
    assert.match(output(result), /No structured secrets in staged diff/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan blocks a structured secret in staged diff', () => {
  const cwd = makeRepo();
  try {
    const field = ['api', 'key'].join('_');
    stage(cwd, 'config.txt', `${field}=${'s'.repeat(16)}\n`);
    const result = runScan(cwd);
    assert.equal(result.status, 1, output(result));
    assert.match(output(result), /Structured secrets found in STAGED diff/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan warns but does not block a bare keyword', () => {
  const cwd = makeRepo();
  try {
    stage(cwd, 'docs.txt', 'This document explains the token concept.\n');
    const result = runScan(cwd);
    assert.equal(result.status, 0, output(result));
    assert.match(output(result), /Keyword matches in STAGED diff/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan ignores unstaged secrets by default', () => {
  const cwd = makeRepo();
  try {
    const file = 'config.txt';
    stage(cwd, file, 'safe baseline\n');
    writeFileSync(path.join(cwd, file), `unsafe ${['token', 'value'].join('_')}=${'u'.repeat(16)}\n`);
    const result = runScan(cwd);
    assert.equal(result.status, 0, output(result));
    assert.doesNotMatch(output(result), /UNSTAGED/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

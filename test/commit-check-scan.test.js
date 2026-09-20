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
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd });
  return cwd;
}

function runScan(cwd, files) {
  return spawnSync('bash', [scan, '--files-from=-'], {
    cwd,
    encoding: 'utf8',
    input: `${files.join('\n')}\n`,
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('scan reads candidate files from the working tree, including untracked files', () => {
  const cwd = makeRepo();
  try {
    writeFileSync(path.join(cwd, 'README.md'), 'safe documentation\n');
    const result = runScan(cwd, ['README.md']);
    assert.equal(result.status, 0, output(result));
    assert.match(output(result), /No structured secrets in candidate files/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan blocks a structured secret without echoing the secret value', () => {
  const cwd = makeRepo();
  try {
    const field = ['api', 'key'].join('_');
    const secret = 's'.repeat(16);
    writeFileSync(path.join(cwd, 'config.txt'), `${field}=${secret}\n`);
    const result = runScan(cwd, ['config.txt']);
    assert.equal(result.status, 1, output(result));
    assert.match(output(result), /Possible structured secret found in candidate files/);
    assert.doesNotMatch(output(result), new RegExp(secret));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan blocks env candidate files even when their contents look safe', () => {
  const cwd = makeRepo();
  try {
    writeFileSync(path.join(cwd, '.env.local'), 'SAFE_PLACEHOLDER=true\n');
    const result = runScan(cwd, ['.env.local']);
    assert.equal(result.status, 1, output(result));
    assert.match(output(result), /\.env candidate file found/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan blocks private-key material', () => {
  const cwd = makeRepo();
  try {
    writeFileSync(path.join(cwd, 'key.txt'), '-----BEGIN OPENSSH PRIVATE KEY-----\n');
    const result = runScan(cwd, ['key.txt']);
    assert.equal(result.status, 1, output(result));
    assert.match(output(result), /Possible structured secret found/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan ignores ordinary secret and token words in prose', () => {
  const cwd = makeRepo();
  try {
    writeFileSync(path.join(cwd, 'docs.txt'), 'This document explains secret storage and token concepts.\n');
    const result = runScan(cwd, ['docs.txt']);
    assert.equal(result.status, 0, output(result));
    assert.doesNotMatch(output(result), /Sensitive keyword found/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan returns unresolved for suspicious credential identifiers', () => {
  const cwd = makeRepo();
  try {
    writeFileSync(path.join(cwd, 'config.txt'), 'Read access_token from the runtime environment.\n');
    const result = runScan(cwd, ['config.txt']);
    assert.equal(result.status, 3, output(result));
    assert.match(output(result), /Sensitive keyword found in candidate files/);
    assert.match(output(result), /false positive/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('scan reports an invalid invocation without scanning the whole repository', () => {
  const cwd = makeRepo();
  try {
    const result = spawnSync('bash', [scan, '--staged-only'], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 2, output(result));
    assert.match(output(result), /usage:/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

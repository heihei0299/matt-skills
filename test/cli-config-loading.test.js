import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createCliFixture() {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-config-'));
  for (const name of ['.agents', 'bin', 'config', 'template']) {
    fs.cpSync(path.join(REPO_ROOT, name), path.join(source, name), { recursive: true });
  }
  fs.cpSync(path.join(REPO_ROOT, 'package.json'), path.join(source, 'package.json'));
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(source, 'node_modules'), 'dir');
  return source;
}

function runList(source) {
  return spawnSync(process.execPath, [path.join(source, 'bin', 'cli.js'), 'list'], {
    cwd: source,
    encoding: 'utf8',
  });
}

test('list fails when default config is missing', () => {
  const source = createCliFixture();
  try {
    fs.rmSync(path.join(source, 'config/default.json'));
    const result = runList(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unable to read default skill config/);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('list fails when default config is invalid JSON', () => {
  const source = createCliFixture();
  try {
    fs.writeFileSync(path.join(source, 'config/default.json'), '{');
    const result = runList(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid default skill config/);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('list fails when default config is not a string array', () => {
  const source = createCliFixture();
  try {
    fs.writeFileSync(path.join(source, 'config/default.json'), JSON.stringify(['tdd', 1]));
    const result = runList(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid default skill config/);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('published package includes required skill config', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.ok(packageJson.files.includes('config/default.json'));
  assert.ok(packageJson.files.includes('config/required.json'));
});

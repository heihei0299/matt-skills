import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

// Seam 1: --help 不再列 update
test('`--help` 不再列 update', () => {
  const { status, stdout, stderr } = runCli(['--help']);
  assert.equal(status, 0, `expected exit 0, got ${status} stderr:${stderr}`);
  assert.ok(!stdout.includes('update'), `HELP should not contain "update", got:\n${stdout}`);
  // sanity: HELP 仍包含 sync
  assert.match(stdout, /sync/, 'HELP should still contain sync');
});

test('无参 help 也不列 update（init/sync/list 仍在）', () => {
  const { status, stdout } = runCli([]);
  assert.equal(status, 0);
  assert.ok(!stdout.includes('update'), `HELP should not contain "update", got:\n${stdout}`);
});

// Seam 2: matt-skills update 提示已合并到 sync 且 exit 1
test('`update` 提示已合并到 sync 且 exit 1', () => {
  const { status, stdout, stderr } = runCli(['update']);
  assert.equal(status, 1, `expected exit 1, got ${status} stdout:${stdout} stderr:${stderr}`);
  const combined = `${stdout}${stderr}`;
  assert.ok(combined.includes('update 已合并到 sync'), `stderr should contain 'update 已合并到 sync', got stdout:${stdout} stderr:${stderr}`);
  // 必须走 stderr
  assert.ok(stderr.includes('update 已合并到 sync'), `should be on stderr, got stderr:${stderr}`);
});

test('`update --dry-run` 同样提示已合并', () => {
  const { status, stderr } = runCli(['update', '--dry-run']);
  assert.equal(status, 1);
  assert.ok(stderr.includes('update 已合并到 sync'));
});

test('`update --force` 同样提示已合并', () => {
  const { status, stderr } = runCli(['update', '--force']);
  assert.equal(status, 1);
  assert.ok(stderr.includes('update 已合并到 sync'));
});

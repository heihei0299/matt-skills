import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');
function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('matt-skills -v / --version outputs bare version and exit 0', () => {
  for (const a of ['-v', '--version']) {
    const { status, stdout, stderr } = runCli([a]);
    assert.equal(status, 0, `${a} exit 0, got ${status} stderr:${stderr}`);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/, `${a} should output bare version, got ${stdout}`);
  }
  // even with sync
  const r = runCli(['sync', '-v']);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('matt-skills -h / --help outputs Usage and exit 0', () => {
  for (const a of ['-h', '--help']) {
    const { status, stdout } = runCli([a]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
  }
});

test('matt-skills init -h only contains Init options', () => {
  const { status, stdout } = runCli(['init', '-h']);
  assert.equal(status, 0);
  assert.match(stdout, /Init options/);
  assert.doesNotMatch(stdout, /Sync options/);
  const { stdout: s2 } = runCli(['sync', '--help']);
  assert.match(s2, /Sync options/);
  assert.doesNotMatch(s2, /Init options/);
});

test('unknown command/option strict fails with stderr and exit 1', () => {
  const r1 = runCli(['--unknown']);
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /error: unknown command/);
  const r2 = runCli(['sync', '--bogus']);
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /error: unknown option/);
  assert.match(r2.stderr, /--bogus/);
});

test('matt-skills sync --dest missing value exits 1', () => {
  const r = runCli(['sync', '--dest']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown option.*--dest.*requires a value|error/);
});

test('matt-skills sync default safe, --all/--force, --all --force mutual exclusive', () => {
  const { stdout: h } = runCli(['sync', '--help']);
  assert.match(h, /--all/);
  assert.match(h, /--force/);
  assert.match(h, /--dry-run/);
  const r = runCli(['sync', '--all', '--force']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--all and --force are mutually exclusive/);
});

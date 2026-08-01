import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');

test('README shows npx install/list usage', () => {
  assert.match(README, /npx @heihei0299\/matt-skills install/);
  assert.match(README, /npx @heihei0299\/matt-skills list/);
  assert.match(README, /list --json/);
});

test('README documents the tool directory mapping for all 4 tools, project and global', () => {
  const rows = [
    [/codex.*\.agents\/skills/, /codex.*\.codex\/skills/],
    [/pi.*\.pi\/skills/, /pi.*\.pi\/agent\/skills/],
    [/opencode.*\.opencode\/skills/, /opencode.*\.config\/opencode\/skills/],
    [/claude.*\.claude\/skills/, /claude.*\.claude\/skills/],
  ];
  for (const [project, global] of rows) {
    assert.ok(project.test(README), `missing project mapping: ${project}`);
    assert.ok(global.test(README), `missing global mapping: ${global}`);
  }
});

test('README documents every CLI flag', () => {
  for (const flag of ['--tools', '--all', '--force', '--global', '--project', '--dest', '--json', '--help']) {
    assert.ok(README.includes(flag), `missing flag: ${flag}`);
  }
});

test('README explains how skills take effect after install', () => {
  assert.ok((README.match(/\/reload/g) || []).length >= 2, 'expected /reload for claude and pi');
  assert.match(README, /下一轮会话/);
});

test('README documents the publish flow and versioning', () => {
  assert.match(README, /npm login/);
  assert.match(README, /npm version patch/);
  assert.match(README, /npm publish --access public/);
  assert.match(README, /随包版本发布/);
});

test('npm pack --dry-run tarball includes skills/, bin/ and README.md', () => {
  const { status, stdout, stderr } = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(status, 0, stderr);
  const data = JSON.parse(stdout);
  const files = data[0].files.map((f) => f.path);
  assert.ok(files.includes('skills/ask-matt/SKILL.md'), 'skills/ missing from tarball');
  assert.ok(files.includes('bin/cli.js'), 'bin/cli.js missing from tarball');
  assert.ok(files.includes('README.md'), 'README.md missing from tarball');
});

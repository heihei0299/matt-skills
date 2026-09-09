import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const ROOT = path.resolve(path.dirname(CLI), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/proprietary.json'), 'utf8'));
const repoLocal = new Set(config.repoLocal);
const distributableNames = fs.readdirSync(path.join(ROOT, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.bak') && entry.name !== 'skill-creator' && !repoLocal.has(entry.name))
  .map((entry) => entry.name);

function runCli(args, cwd = ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('CLI help uses distribution semantics instead of stale skill counts', () => {
  const source = fs.readFileSync(CLI, 'utf8');
  assert.doesNotMatch(source, /\b(?:26|32|33)\b/);

  for (const command of ['init', 'sync', 'list', 'install', 'check']) {
    const result = runCli([command, '--help']);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.match(runCli(['init', '--help']).stdout, /default programming|默认.*编程/);
  assert.match(runCli(['list', '--help']).stdout, /distributable|可分发/);
  assert.match(runCli(['install', '--help']).stdout, /distributable|可分发/);
  assert.match(runCli(['sync', '--help']).stdout, /distributable|可分发/);
});

test('init summary excludes preserved repo-local directories from installed count', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-stats-'));
  try {
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL AGENTS');
    for (const name of repoLocal) {
      const dir = path.join(dest, '.agents/skills', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `USER CUSTOM ${name}`);
    }

    const result = runCli(['init', '--all', '--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    const match = result.stdout.match(/技能：已装 (\d+)/);
    assert.ok(match, `missing installed count in:\n${result.stdout}`);
    assert.equal(Number(match[1]), distributableNames.length);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

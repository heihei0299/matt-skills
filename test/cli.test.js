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

function runCli(args, cwd = REPO_ROOT, env = process.env) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env });
}

function installedDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

test('`install --all --dest` copies every skill (incl. attached files) and prints a summary', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.deepEqual(installedDirs(dest), [...SKILL_NAMES].sort());
    assert.ok(fs.existsSync(path.join(dest, 'triage', 'AGENT-BRIEF.md')), 'triage/AGENT-BRIEF.md missing');
    assert.ok(fs.existsSync(path.join(dest, 'tdd', 'tests.md')), 'tdd/tests.md missing');
    assert.match(stdout, /已装 24、跳过 0/);
    assert.match(stdout, new RegExp(`目标路径：${escapeRegExp(dest)}`));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --all --tools codex` installs into `.agents/skills/` and prints a per-tool summary', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'codex'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.agents', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`codex: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
test('`install --all --tools pi` installs into `.pi/skills/`', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'pi'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.pi', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`pi: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --all --tools opencode` installs into `.opencode/skills/`', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'opencode'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.opencode', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`opencode: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --all --tools claude` installs into `.claude/skills/`', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'claude'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.claude', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`claude: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
test('`install --all --tools codex,claude` installs into both tool dirs with per-tool summaries', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'codex,claude'], cwd);
    assert.equal(status, 0, stderr);
    const codexTarget = path.join(cwd, '.agents', 'skills');
    const claudeTarget = path.join(cwd, '.claude', 'skills');
    assert.deepEqual(installedDirs(codexTarget), [...SKILL_NAMES].sort());
    assert.deepEqual(installedDirs(claudeTarget), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`codex: 已装 24、跳过 0 → ${escapeRegExp(codexTarget)}`));
    assert.match(stdout, new RegExp(`claude: 已装 24、跳过 0 → ${escapeRegExp(claudeTarget)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`--global --tools codex` installs into $HOME/.codex/skills/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
  const env = { ...process.env, HOME: home };
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--global', '--tools', 'codex'], REPO_ROOT, env);
    assert.equal(status, 0, stderr);
    const target = path.join(home, '.codex', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`codex: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('`--global --tools pi` installs into $HOME/.pi/agent/skills/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
  const env = { ...process.env, HOME: home };
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--global', '--tools', 'pi'], REPO_ROOT, env);
    assert.equal(status, 0, stderr);
    const target = path.join(home, '.pi', 'agent', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`pi: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('`--global --tools opencode` installs into $HOME/.config/opencode/skills/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
  const env = { ...process.env, HOME: home };
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--global', '--tools', 'opencode'], REPO_ROOT, env);
    assert.equal(status, 0, stderr);
    const target = path.join(home, '.config', 'opencode', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`opencode: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('`--global --tools claude` installs into $HOME/.claude/skills/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
  const env = { ...process.env, HOME: home };
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--global', '--tools', 'claude'], REPO_ROOT, env);
    assert.equal(status, 0, stderr);
    const target = path.join(home, '.claude', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`claude: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('rerunning multi-tool install without --force skips existing skills for every tool', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const first = runCli(['install', '--all', '--tools', 'codex,claude'], cwd);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(cwd, '.agents', 'skills', 'tdd', 'tests.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'codex,claude'], cwd);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /codex: 已装 0、跳过 24/);
    assert.match(stdout, /claude: 已装 0、跳过 24/);
    assert.equal(fs.readFileSync(path.join(cwd, '.agents', 'skills', 'tdd', 'tests.md'), 'utf8'), 'LOCAL EDIT');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --all` rerun without --force skips existing skills and does not overwrite local edits', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const first = runCli(['install', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'tdd', 'tests.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['install', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /已装 0、跳过 24/);
    assert.equal(fs.readFileSync(path.join(dest, 'tdd', 'tests.md'), 'utf8'), 'LOCAL EDIT');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --all --force` overwrites existing skills and restores package content', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const first = runCli(['install', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'tdd', 'tests.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['install', '--all', '--force', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /已装 24、跳过 0/);
    const source = fs.readFileSync(path.join(REPO_ROOT, 'skills', 'tdd', 'tests.md'), 'utf8');
    assert.equal(
      fs.readFileSync(path.join(dest, 'tdd', 'tests.md'), 'utf8'),
      source,
      'tdd/tests.md should be restored from package content by --force',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --dest` without a value fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--dest']);
  assert.notEqual(status, 0);
  assert.match(stderr, /--dest/);
});

test('`install --all --dest` overrides tool mapping and ignores --tools', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--dest', dest, '--tools', 'claude'], cwd);
    assert.equal(status, 0, stderr);
    assert.deepEqual(installedDirs(dest), [...SKILL_NAMES].sort());
    assert.ok(!fs.existsSync(path.join(cwd, '.claude')), '.claude should not be created when --dest is used');
    assert.match(stdout, new RegExp(`已装 24、跳过 0`));
    assert.match(stdout, new RegExp(`目标路径：${escapeRegExp(dest)}`));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --tools` with an unknown tool fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--tools', 'bogus']);
  assert.notEqual(status, 0);
  assert.match(stderr, /未知工具：bogus/);
});

test('`install --tools` without a value fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--tools']);
  assert.notEqual(status, 0);
  assert.match(stderr, /--tools/);
});

test('`install --global --project` together fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--global', '--project', '--tools', 'codex']);
  assert.notEqual(status, 0);
  assert.match(stderr, /--global/);
  assert.match(stderr, /--project/);
});
test('`install --tools ","` (empty tool list) fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--tools', ',']);
  assert.notEqual(status, 0);
  assert.match(stderr, /--tools/);
});

test('`install --tools codex,codex` deduplicates tools and installs once', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--tools', 'codex,codex'], cwd);
    assert.equal(status, 0, stderr);
    assert.deepEqual(installedDirs(path.join(cwd, '.agents', 'skills')), [...SKILL_NAMES].sort());
    const codexLines = stdout.split('\n').filter((l) => l.startsWith('codex:'));
    assert.equal(codexLines.length, 1);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --dest --global` together fails with a non-zero exit', () => {
  const { status, stderr } = runCli(['install', '--all', '--dest', '/tmp/any', '--global']);
  assert.notEqual(status, 0);
  assert.match(stderr, /--dest/);
  assert.match(stderr, /--global/);
});

test('`install --project` installs into project-level tool directories', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--project', '--tools', 'codex'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.agents', 'skills');
    assert.deepEqual(installedDirs(target), [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`codex: 已装 24、跳过 0 → ${escapeRegExp(target)}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`--help` documents --tools, --global, --project and --dest', () => {
  const { status, stdout, stderr } = runCli(['--help']);
  assert.equal(status, 0, stderr);
  assert.match(stdout, /--tools/);
  assert.match(stdout, /--global/);
  assert.match(stdout, /--project/);
  assert.match(stdout, /--dest/);
});

test('`install` without --all in a non-interactive shell prints a hint and exits non-zero', () => {
  const { status, stdout } = runCli(['install']);
  assert.notEqual(status, 0);
  assert.match(stdout, /非交互环境/);
});

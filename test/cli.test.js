import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

// Independent literal: the distributable skills shipped to user projects.
const SKILL_NAMES = [
  'ask-matt',
  'codebase-design',
  'code-review',
  'diagnose-fix',
  'diagnosing-bugs',
  'domain-modeling',
  'grill-me',
  'grill-to-spec',
  'grill-with-docs',
  'grilling',
  'handoff',
  'implement',
  'implement-review-loop',
  'improve-codebase-architecture',
  'instance-test',
  'prototype',
  'research',
  'resolving-merge-conflicts',
  'scaffold-functional-test',
  'setup-matt-pocock-skills',
  'show-me',
  'tdd',
  'tdd-implement',
  'teach',
  'to-spec',
  'to-tickets',
  'triage',
  'wayfinder',
  'to-questionnaire',
  'wait-what',
  'wizard',
  'writing-for-agents',
  'initialize-project',
];

// Default bundle: workflow roots plus their hard dependencies.
const PROGRAMMING_SKILL_NAMES = [
  'diagnosing-bugs',
  'domain-modeling',
  'grill-with-docs',
  'grilling',
  'initialize-project',
  'setup-matt-pocock-skills',
  'tdd',
  'to-spec',
  'to-tickets',
];

// Literal lines copied from the skills' SKILL.md frontmatter, including
// quoted, colon-containing, and non-ASCII descriptions.
const SAMPLE_LINES = [
  'grill-with-docs — A relentless interview to sharpen a plan or design, which also creates docs (ADR\'s and glossary) as we go.',
];

const GRILL_WITH_DOCS_DESCRIPTION =
  'A relentless interview to sharpen a plan or design, which also creates docs (ADR\'s and glossary) as we go.';

function runCli(args, cwd = REPO_ROOT, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
    input: opts.input,
  });
}

test('`list` exits 0 and prints default workflow skills by default', () => {
  const { status, stdout, stderr } = runCli(['list']);
  assert.equal(status, 0, stderr);
  const lines = stdout.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, PROGRAMMING_SKILL_NAMES.length);
  const names = lines.map((line) => line.split(' — ')[0]);
  assert.deepEqual([...names].sort(), [...PROGRAMMING_SKILL_NAMES].sort());
});

test('`list --all` prints all distributable skills', () => {
  const { status, stdout, stderr } = runCli(['list', '--all']);
  assert.equal(status, 0, stderr);
  const lines = stdout.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, SKILL_NAMES.length);
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

test('`list --json` emits the default workflow skills by default', () => {
  const { status, stdout, stderr } = runCli(['list', '--json']);
  assert.equal(status, 0, stderr);
  const skills = JSON.parse(stdout);
  assert.equal(skills.length, PROGRAMMING_SKILL_NAMES.length);
  assert.deepEqual(
    skills.map((s) => s.name).sort(),
    [...PROGRAMMING_SKILL_NAMES].sort(),
  );
  assert.deepEqual(
    skills.find((s) => s.name === 'grill-with-docs'),
    { name: 'grill-with-docs', description: GRILL_WITH_DOCS_DESCRIPTION },
  );
});

test('`list --all --json` emits all distributable skills', () => {
  const { status, stdout, stderr } = runCli(['list', '--all', '--json']);
  assert.equal(status, 0, stderr);
  const skills = JSON.parse(stdout);
  assert.equal(skills.length, SKILL_NAMES.length);
  assert.deepEqual(
    skills.map((s) => s.name).sort(),
    [...SKILL_NAMES].sort(),
  );
});

test('`list` works from any working directory (temp dir)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-'));
  try {
    const { status, stdout, stderr } = runCli(['list'], tmp);
    assert.equal(status, 0, stderr);
    assert.equal(stdout.trim().split('\n').filter(Boolean).length, PROGRAMMING_SKILL_NAMES.length);
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

test('`install --all --dest` copies every skill (incl. attached files) and prints summary', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    const installed = fs
      .readdirSync(dest, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
    assert.ok(fs.existsSync(path.join(dest, 'triage', 'AGENT-BRIEF.md')), 'triage/AGENT-BRIEF.md missing');
    assert.ok(fs.existsSync(path.join(dest, 'tdd', 'tests.md')), 'tdd/tests.md missing');
    assert.match(stdout, new RegExp(`已装 ${SKILL_NAMES.length}、跳过 0`));
    assert.match(stdout, new RegExp(`目标路径：${dest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --all` rerun without --force skips existing skills and does not overwrite', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const first = runCli(['install', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'tdd', 'tests.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['install', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, new RegExp(`已装 0、跳过 ${SKILL_NAMES.length}`));
    assert.equal(fs.readFileSync(path.join(dest, 'tdd', 'tests.md'), 'utf8'), 'LOCAL EDIT');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --tools codex --all` lands in `.agents/skills/` under the working directory', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'codex', '--all'], cwd);
    assert.equal(status, 0, stderr);
    const target = path.join(cwd, '.agents', 'skills');
    const installed = fs
      .readdirSync(target, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
    assert.match(stdout, new RegExp(`已装 ${SKILL_NAMES.length}、跳过 0`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --force` overwrites existing skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const first = runCli(['install', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'tdd', 'tests.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['install', '--all', '--force', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, new RegExp(`已装 ${SKILL_NAMES.length}、跳过 0`));
    const source = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'tdd', 'tests.md'), 'utf8');
    assert.equal(
      fs.readFileSync(path.join(dest, 'tdd', 'tests.md'), 'utf8'),
      source,
      'tdd/tests.md should be restored from package content by --force',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('interactive install searches and selects from the default workflow catalog', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-interactive-install-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'codex'], cwd, { input: 'grill-with-docs \n' });
    assert.equal(status, 0, stderr);
    const installed = fs
      .readdirSync(path.join(cwd, '.agents', 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(installed, ['grill-with-docs']);
    assert.match(stdout, /codex：已装 1、跳过 0/);
    assert.ok(!installed.includes('teach'), 'interactive install should not expose optional productivity skills');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('interactive install handles a search with no matches', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-interactive-install-empty-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'codex'], cwd, { input: 'no-such-skill\n' });
    assert.equal(status, 0, stderr);
    assert.match(stdout, /未选择任何技能/);
    assert.ok(!fs.existsSync(path.join(cwd, '.agents', 'skills')));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install --tools codex` without --all prints a no-skill message and exits 0', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'codex'], cwd, { input: '\n' });
    assert.equal(status, 0, stderr);
    assert.match(stdout, /未选择任何技能/);
    assert.ok(!fs.existsSync(path.join(cwd, '.agents', 'skills')), 'nothing should be installed');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

const PROJECT_MAPPING = {
  codex: '.agents/skills',
  pi: '.agents/skills',
  opencode: '.agents/skills',
  claude: '.agents/skills',
};

const GLOBAL_MAPPING = {
  codex: '.codex/skills',
  pi: '.pi/agent/skills',
  opencode: '.config/opencode/skills',
  claude: '.claude/skills',
};

test('project install maps each tool to its default project directory', async (t) => {
  for (const [tool, rel] of Object.entries(PROJECT_MAPPING)) {
    await t.test(`${tool} → ${rel}`, () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
      try {
        const { status, stdout, stderr } = runCli(['install', '--tools', tool, '--all'], cwd);
        assert.equal(status, 0, stderr);
        const target = path.join(cwd, rel);
        const installed = fs
          .readdirSync(target, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort();
        assert.deepEqual(installed, [...SKILL_NAMES].sort());
        assert.match(stdout, new RegExp(`目标路径：${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    });
  }
});

test('global install maps each tool under $HOME', async (t) => {
  for (const [tool, rel] of Object.entries(GLOBAL_MAPPING)) {
    await t.test(`${tool} → ~/${rel}`, () => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-home-'));
      try {
        const { status, stdout, stderr } = runCli(
          ['install', '--tools', tool, '--all', '--global'],
          REPO_ROOT,
          { env: { HOME: home } },
        );
        assert.equal(status, 0, stderr);
        const target = path.join(home, rel);
        const installed = fs
          .readdirSync(target, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort();
        assert.deepEqual(installed, [...SKILL_NAMES].sort());
        assert.match(stdout, new RegExp(`目标路径：${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      } finally {
        fs.rmSync(home, { recursive: true, force: true });
      }
    });
  }
});

test('`install --tools claude,codex --all` deduplicates the shared project directory', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'claude,codex', '--all'], cwd);
    assert.equal(status, 0, stderr);
    for (const rel of ['.agents/skills']) {
      const target = path.join(cwd, rel);
      const installed = fs
        .readdirSync(target, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      assert.deepEqual(installed, [...SKILL_NAMES].sort(), rel);
      assert.match(stdout, new RegExp(`目标路径：${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`--dest` overrides tool mapping and ignores `--tools`', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-dest-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'codex', '--all', '--dest', dest], cwd);
    assert.equal(status, 0, stderr);
    const installed = fs
      .readdirSync(dest, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
    assert.ok(!fs.existsSync(path.join(cwd, '.agents', 'skills')), 'tool mapping must be ignored with --dest');
    assert.match(stdout, new RegExp(`目标路径：${dest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`install --tools` with only unknown tools prints a no-tool message and exits 0', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install', '--tools', 'bogus', '--all'], cwd);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /未选择任何工具/);
    assert.ok(!fs.existsSync(path.join(cwd, '.agents', 'skills')));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`install` with an empty tool selection prints a no-tool message and exits 0', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['install'], cwd, { input: '\n' });
    assert.equal(status, 0, stderr);
    assert.match(stdout, /未选择任何工具/);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('`list` piped to a closed reader exits cleanly (no EPIPE crash)', async () => {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, [CLI, 'list'], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.destroy(); // simulate `list | head` closing the pipe early
  const code = await new Promise((resolve) => child.on('exit', resolve));
  assert.equal(code, 0);
});

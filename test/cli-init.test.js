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
];

const PROGRAMMING_SKILL_NAMES = [
  'ask-matt',
  'code-review',
  'codebase-design',
  'diagnose-fix',
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
  'show-me',
  'tdd',
  'tdd-implement',
  'to-spec',
  'to-tickets',
  'triage',
  'wayfinder',
  'wizard',
];

// Template files that must land in the target project root (single-source) — default programming scope.
const TEMPLATE_FILES_PROGRAMMING = [
  'AGENTS.md',
  '.agents/skills/tdd-implement/SKILL.md',
  '.agents/skills/diagnose-fix/SKILL.md',
  '.agents/skills/tdd/SKILL.md',
  '.agents/skills/grilling/SKILL.md',
  '.opencode/CONTEXT.md',
  '.opencode/commands/issue-audit.md',
  '.opencode/docs/agents/runtime-discipline.md',
  '.pi/prompts/issue-audit.md',
  '.pi/skills/.gitkeep',
  '.opencode/skills/.gitkeep',
];
const TEMPLATE_FILES = [
  'AGENTS.md',
  '.agents/skills/tdd-implement/SKILL.md',
  '.agents/skills/diagnose-fix/SKILL.md',
  '.agents/skills/grilling/SKILL.md',
  '.opencode/CONTEXT.md',
  '.opencode/commands/issue-audit.md',
  '.opencode/docs/agents/runtime-discipline.md',
  '.pi/prompts/issue-audit.md',
  '.pi/skills/.gitkeep',
  '.opencode/skills/.gitkeep',
];

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function listDir(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

test('`init` copies the default programming template into the target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已(复制|备份)/);
    assert.match(stdout, /技能：已装/);
    for (const rel of TEMPLATE_FILES_PROGRAMMING) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
    // 独有所需 grilling/grill-me/handoff/show-me 默认安装，其余 productivity 默认不装
    assert.ok(fs.existsSync(path.join(dest, '.agents/skills/grilling/SKILL.md')), '独有所需 grilling should be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents/skills/teach/SKILL.md')), 'productivity teach should NOT be installed by default');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` copies all distributable skills', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies default programming skills into .agents/skills/ by default', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    const installed = listDir(path.join(dest, '.agents', 'skills'));
    assert.deepEqual(installed, [...PROGRAMMING_SKILL_NAMES].sort());
    for (const name of ['tdd-implement', 'diagnose-fix']) {
      assert.ok(
        fs.existsSync(path.join(dest, '.agents', 'skills', name, 'SKILL.md')),
        `${name} should land in .agents/skills/ (single source)`,
      );
    }
    // default proprietary is part of the default programming set
    assert.ok(fs.existsSync(path.join(dest, '.agents', 'skills', 'grill-to-spec', 'SKILL.md')), 'grill-to-spec should be installed by default');
    assert.ok(!fs.existsSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md')), 'ci-guard should NOT be installed by default');
    for (const harness of ['.pi/skills', '.opencode/skills']) {
      const entries = fs.readdirSync(path.join(dest, harness));
      assert.ok(entries.includes('.gitkeep'), `${harness} missing .gitkeep`);
      const real = entries.filter(e => !['.gitkeep','README.md'].includes(e));
      assert.deepEqual(real, [], `${harness} should contain no shared skills`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` copies all distributable skills into .agents/skills/', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    const installed = listDir(path.join(dest, '.agents', 'skills'));
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --all` refreshes an existing target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--all', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'STALE AGENTS');
    fs.mkdirSync(path.join(dest, '.agents', 'skills', 'ci-guard'), { recursive: true });
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'STALE SKILL');
    const { status, stdout, stderr } = runCli(['init', '--all', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已复制/);
    assert.equal(
      fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'),
      fs.readFileSync(path.join(REPO_ROOT, 'template', 'AGENTS.md'), 'utf8'),
    );
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'ci-guard', 'SKILL.md'), 'utf8'),
      'STALE SKILL',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` on an already-initialized project skips without overwriting', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    fs.writeFileSync(path.join(dest, '.agents', 'skills', 'tdd', 'SKILL.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板已存在（AGENTS.md），跳过/);
    // 模板已存在时不再打印新增计数，而是跳过
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT');
    assert.equal(
      fs.readFileSync(path.join(dest, '.agents', 'skills', 'tdd', 'SKILL.md'), 'utf8'),
      'LOCAL EDIT',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --force` is rejected (no hard overwrite)', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    const { status, stderr } = runCli(['init', '--dest', dest, '--force']);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
    assert.equal(fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'), 'LOCAL EDIT');
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init --force --all` is rejected', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    const { status, stderr } = runCli(['init', '--all', '--dest', dest, '--force']);
    assert.equal(status, 1);
    assert.match(stderr, /unknown option '--force'/);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` without --dest targets the current working directory (programming)', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['init'], cwd);
    assert.equal(status, 0, stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'tdd-implement', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'diagnose-fix', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'grill-to-spec', 'SKILL.md')), 'grill-to-spec should not be installed by default');
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'grilling', 'SKILL.md')), '独有所需 grilling should be installed by default');
    assert.ok(fs.existsSync(path.join(cwd, '.opencode/skills/.gitkeep')));
    assert.match(stdout, new RegExp(`目标路径：${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

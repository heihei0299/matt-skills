import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

// Independent literal: the 32 skills shipped in this repo.
const SKILL_NAMES = [
  'ask-matt',
  'ci-guard',
  'codebase-design',
  'code-review',
  'commit-check',
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

const PROPRIETARY = ['ci-guard', 'tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check', 'scaffold-functional-test'];

// Template files that must land in the target project root (single-source).
const TEMPLATE_FILES = [
  'AGENTS.md',
  '.agents/skills/tdd-implement/SKILL.md',
  '.agents/skills/diagnose-fix/SKILL.md',
  '.agents/skills/commit-check/scripts/scan-sensitive.sh',
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

test('`init` copies the full template (AGENTS.md, .agents/skills, .opencode/, .pi/) into the target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已(复制|备份)/);
    // 新模板一次性分发全量 32 技能，不再单独打印上游技能 26
    assert.match(stdout, /技能：已装/);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies ALL skills (upstream + proprietary) into .agents/skills/', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    const installed = listDir(path.join(dest, '.agents', 'skills'));
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
    for (const name of PROPRIETARY) {
      assert.ok(
        fs.existsSync(path.join(dest, '.agents', 'skills', name, 'SKILL.md')),
        `${name} should land in .agents/skills/ (single source)`,
      );
    }
    // harness skill dirs should be empty placeholders, not contain shared skills
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

test('`init --force` overwrites an existing project', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const first = runCli(['init', '--dest', dest]);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), 'LOCAL EDIT');
    const { status, stdout, stderr } = runCli(['init', '--dest', dest, '--force']);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已(复制|备份|覆盖)/);
    // force 后应包含全量技能
    const installed = listDir(path.join(dest, '.agents', 'skills'));
    assert.deepEqual(installed, [...SKILL_NAMES].sort());
    const source = fs.readFileSync(path.join(REPO_ROOT, 'template', 'AGENTS.md'), 'utf8');
    assert.equal(
      fs.readFileSync(path.join(dest, 'AGENTS.md'), 'utf8'),
      source,
      'AGENTS.md should be restored from the template by --force',
    );
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` without --dest targets the current working directory', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-cwd-'));
  try {
    const { status, stdout, stderr } = runCli(['init'], cwd);
    assert.equal(status, 0, stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'grill-to-spec', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'grilling')));
    assert.ok(fs.existsSync(path.join(cwd, '.pi/skills/.gitkeep')));
    assert.ok(fs.existsSync(path.join(cwd, '.opencode/skills/.gitkeep')));
    assert.match(stdout, new RegExp(`目标路径：${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(CLI), '..');

// Independent literal: the 26 skills shipped in this repo.
const SKILL_NAMES = [
  'ask-matt',
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

// Proprietary skills: mirrored into template/.opencode/skills + template/.pi/skills,
// never copied into .agents/skills/ by `init`.
const PROPRIETARY = ['tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check'];

const UPSTREAM = [...SKILL_NAMES].filter((n) => !PROPRIETARY.includes(n)).sort();

// Template files that must land in the target project root.
const TEMPLATE_FILES = [
  'AGENTS.md',
  '.opencode/CONTEXT.md',
  '.opencode/commands/issue-audit.md',
  '.opencode/skills/tdd-implement/SKILL.md',
  '.opencode/skills/diagnose-fix/SKILL.md',
  '.opencode/docs/agents/runtime-discipline.md',
  '.pi/prompts/issue-audit.md',
  '.pi/skills/tdd-implement/SKILL.md',
  '.pi/skills/commit-check/scripts/scan-sensitive.sh',
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

test('`init` copies the full template (AGENTS.md, .opencode/, .pi/) into the target', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /模板：已复制/);
    assert.match(stdout, /上游技能：已装 22、跳过 0/);
    for (const rel of TEMPLATE_FILES) {
      assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('`init` copies upstream skills into .agents/skills/ but never the proprietary ones', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-skills-init-'));
  try {
    const { status, stdout, stderr } = runCli(['init', '--dest', dest]);
    assert.equal(status, 0, stderr);
    const installed = listDir(path.join(dest, '.agents', 'skills'));
    assert.deepEqual(installed, UPSTREAM);
    for (const name of PROPRIETARY) {
      assert.ok(
        !fs.existsSync(path.join(dest, '.agents', 'skills', name)),
        `${name} must not land in .agents/skills/`,
      );
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
    assert.match(stdout, /上游技能：已装 0、跳过 22/);
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
    assert.match(stdout, /模板：已复制/);
    assert.match(stdout, /上游技能：已装 22、跳过 0/);
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
    assert.ok(fs.existsSync(path.join(cwd, '.opencode', 'skills', 'grill-to-spec', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'grilling')));
    assert.match(stdout, new RegExp(`目标路径：${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

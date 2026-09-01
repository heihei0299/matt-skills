import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard commit-check: the pre-commit gate (review docs, align README,
// keep the directory clean, write a clear commit message). Since 1.5.4 it
// prioritizes README + matt-skills flow files (AGENTS/CONTEXT/template).
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(dir, '.agents', 'skills', 'commit-check', 'SKILL.md');
const scanPath = path.join(dir, '.agents', 'skills', 'commit-check', 'scripts', 'scan-sensitive.sh');
const skill = readFileSync(skillPath, 'utf8');
const scan = readFileSync(scanPath, 'utf8');

test('frontmatter triggers on commit and promises a pre-commit gate', () => {
  assert.match(skill, /name: commit-check/);
  assert.match(skill, /pre-commit gate/i);
  assert.match(skill, /about to commit/);
});

test('carries all four checks', () => {
  assert.match(skill, /审查文档/);
  assert.match(skill, /对齐 README/);
  assert.match(skill, /保持目录卫生/);
  assert.match(skill, /commit message/);
});

test('keeps the directory clean: temp artifacts + git status + secrets', () => {
  assert.match(skill, /git status/);
  assert.match(skill, /未跟踪文件/);
  assert.match(skill, /\[DEBUG-\.\.\.\]/);
  assert.match(skill, /敏感信息/);
  assert.match(skill, /密钥/);
});

test('delegates the secret scan to a deterministic script (no freehand grep)', () => {
  assert.match(skill, /scripts\/scan-sensitive\.sh/);
  assert.match(skill, /不用手写扫描/);
  assert.match(scan, /git diff --cached/);
  assert.match(scan, /--staged-only/);
  assert.match(scan, /PRIVATE KEY/);
});

test('writes a conventional commit message', () => {
  assert.match(skill, /feat\/fix\/docs\/chore\/refactor\/test/);
  assert.match(skill, /subject/);
  assert.match(skill, /一次 commit 只含一个逻辑变更/);
});

test('executes serially within one turn until all four pass', () => {
  assert.match(skill, /回合内串行/);
  assert.match(skill, /不等用户/);
  assert.match(skill, /全部通过才 commit/);
});

test('focuses on README and matt-skills flow files', () => {
  // Per 1.5.4+ requirement: commit-check prioritizes README + matt-skills flow files (AGENTS/CONTEXT/template/skills)
  assert.match(skill, /matt-skills/i);
  assert.match(skill, /README/);
  assert.match(skill, /AGENTS\.md/);
  assert.match(skill, /CONTEXT\.md/);
  assert.match(skill, /template\//);
});

test('defers review semantics to the code-review skill (single source of truth)', () => {
  assert.match(skill, /code-review/);
  assert.match(skill, /唯一事实源/);
  assert.match(skill, /不重写/);
});

test('references tdd-implement without coupling to its stage orchestration', () => {
  assert.match(skill, /tdd-implement/);
  assert.doesNotMatch(skill, /阶段⑥/); // decoupled from tdd-implement stage numbers (4295aca)
  assert.match(skill, /门禁/);
});

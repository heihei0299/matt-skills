import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, normalize } from './mirror-utils.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const read = (file) => readFileSync(root(file), 'utf8');

const skill = read('.agents/skills/commit-check/SKILL.md');
const templateSkill = read('template/.agents/skills/commit-check/SKILL.md');
const scan = read('.agents/skills/commit-check/scripts/scan-sensitive.sh');

test('commit-check is an explicit staged commit gate', () => {
  for (const content of [skill, templateSkill]) {
    assert.match(content, /name: commit-check/);
    assert.match(content, /^disable-model-invocation:\s*true$/m);
    assert.match(content, /staged commit gate/);
    assert.match(content, /用户显式调用 `\/commit-check`/);
    assert.match(content, /不负责 staging/);
    assert.match(content, /不执行 `git commit`/);
    assert.doesNotMatch(content, /Use whenever the user is about to commit/);
  }
});

test('commit-check defines exactly three core gates', () => {
  assert.match(skill, /### ① Staged scope/);
  assert.match(skill, /### ② Sensitive scan/);
  assert.match(skill, /### ③ Commit message/);
  assert.match(skill, /git diff --cached/);
  assert.match(skill, /scripts\/scan-sensitive\.sh --staged-only/);
  assert.match(skill, /<type>\(<scope>\): <subject>/);
  assert.doesNotMatch(skill, /文档一致性 → 保持目录卫生/);
  assert.doesNotMatch(skill, /提交后工作区应为干净/);
  assert.doesNotMatch(skill, /阶段⑦/);
});

test('core gates preserve staging and commit boundaries', () => {
  assert.match(skill, /调用方负责 `git add`/);
  assert.match(skill, /不自动 stage、unstage 或清理文件/);
  assert.match(skill, /工作区可以保留其它未暂存修改/);
  assert.match(skill, /通过后报告 `ready to commit`/);
  assert.match(skill, /不自动修复、不自动 stage、不自动 commit/);
});

test('sensitive scan keeps structured failures and keyword warnings', () => {
  assert.match(skill, /结构化 secret assignment 和 private key block.*fail/s);
  assert.match(skill, /普通 .*关键词.*warning/s);
  assert.match(scan, /git diff --cached -U0/);
  assert.match(scan, /--staged-only/);
  assert.match(scan, /Structured secrets found in STAGED diff/);
  assert.match(scan, /Keyword matches in STAGED diff/);
  assert.doesNotMatch(scan, /git diff -U0/);
});

test('commit message gate is lightweight and result-oriented', () => {
  assert.match(skill, /feat.*fix.*docs.*chore.*refactor.*test/s);
  assert.match(skill, /subject 描述变更结果/);
  assert.match(skill, /body 可选/);
  assert.match(skill, /一个 commit 只表达一个逻辑变更/);
  assert.doesNotMatch(skill, /完整测试报告模板/);
});

test('matt-skills adapter is conditional on relevant staged paths', () => {
  for (const pathPattern of [
    'README.md',
    'AGENTS.md',
    'CONTEXT.md',
    'docs/agents/',
    'template/',
    '.agents/skills/',
    'config/',
    'scripts/build-template.js',
    '.opencode/commands/',
    '.pi/prompts/',
  ]) {
    assert.match(skill, new RegExp(pathPattern.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
  assert.match(skill, /相关模板\/契约测试/);
  assert.match(skill, /只检查本次 staged 路径相关的内容/);
  assert.match(skill, /test\/template-sync\.test\.js/);
});

test('Git history is a pointer, not a duplicated destructive-command policy', () => {
  assert.match(skill, /Git History Preservation/);
  assert.match(skill, /BASE_HEAD/);
  assert.match(skill, /git merge-base --is-ancestor/);
  assert.doesNotMatch(skill, /git reset --hard/);
  assert.doesNotMatch(skill, /git checkout \\./);
  assert.doesNotMatch(skill, /git clean -fd/);
});

test('commit-check stays independent from implementation and review execution', () => {
  assert.match(skill, /不成为任何实现流程的自动子步骤/);
  assert.doesNotMatch(skill, /调用.*tdd-implement/);
  assert.doesNotMatch(skill, /code-review/);
});

test('template mirrors the compact commit-check skill', () => {
  assert.equal(
    normalize(read('template/.agents/skills/commit-check/SKILL.md'), MAP_SKILL),
    skill,
  );
  assert.equal(
    read('template/.agents/skills/commit-check/scripts/scan-sensitive.sh'),
    scan,
  );
});

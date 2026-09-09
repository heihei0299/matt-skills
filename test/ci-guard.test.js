import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const skill = read('.agents/skills/ci-guard/SKILL.md');
const workflow = read('.github/workflows/ci.yml');

test('ci-guard is explicit-only and repository-scoped', () => {
  assert.match(skill, /disable-model-invocation:\s*true/);
  assert.match(skill, /matt-skills 仓库专用/);
  assert.match(skill, /@heihei0299\/matt-skills/);
  assert.match(skill, /repo mismatch/);
  assert.match(skill, /不得把本仓库的 workflow、tag 或 npm 发布假设套到其它项目/);
});

test('ci-guard is scenario-based and reads the actual workflow as source of truth', () => {
  assert.match(skill, /场景选择/);
  assert.match(skill, /发布路径/);
  assert.match(skill, /Workflow 维护路径/);
  assert.match(skill, /发布后故障路径/);
  assert.match(skill, /以实际 workflow.*事实源/);
  assert.match(skill, /不硬编码 job 名称/);
});

test('release path keeps only release-specific gates', () => {
  assert.match(skill, /npm pack --dry-run/);
  assert.match(skill, /推送.*tag/);
  assert.match(skill, /等待 tag workflow/);
  assert.match(skill, /registry.*回读/);
  assert.match(skill, /普通发布不运行.*lint.*dry-run.*dispatch/);
});

test('ci-guard matches current workflow inputs and dependencies', () => {
  assert.match(workflow, /publish:/);
  assert.match(workflow, /needs: \[verify\]/);
  assert.match(workflow, /rollback_tag:/);
  assert.doesNotMatch(skill, /publish\.needs.*\[build, verify\]/);
  assert.doesNotMatch(skill, /gh workflow run .*dry_run/);
  assert.doesNotMatch(skill, /inputs\.rollback_version/);
  assert.doesNotMatch(skill, /gh release delete/);
  assert.doesNotMatch(skill, /cargo test|clippy|rustfmt/);
});

test('workflow checks do not invent unavailable inputs or tools', () => {
  assert.match(skill, /只使用 workflow 已声明的 input/);
  assert.match(skill, /工具不可用.*unavailable/);
  assert.match(skill, /不得伪报通过/);
});

test('ci-guard remains workspace-only', () => {
  assert.equal(existsSync(path.join(dir, 'template/.agents/skills/ci-guard')), false);
  assert.equal(existsSync(path.join(dir, '.agents/skills/ci-guard/SKILL.md')), true);
});

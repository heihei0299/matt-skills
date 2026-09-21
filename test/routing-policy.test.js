import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');

const expectedIntro = '本仓库遵循全局 `AGENTS.md`；以下规则仅用于具体化本项目工作流，不放宽全局安全、授权或运行时权限边界。';

function assertNoLegacyRoutes(content) {
  assert.doesNotMatch(content, /## Workflow|## 路由|## Security/);
  assert.doesNotMatch(content, /外部调研|原型 \/ PoC|简单修改 → 直接实现|TDD \/ 集成测试|代码审查|设计质询|领域建模|无法归类/);
}

test('workspace and distributed instructions delegate to global AGENTS.md', () => {
  assert.equal(agents, templateAgents);
  assert.ok(agents.startsWith(`${expectedIntro}\n`));
  assertNoLegacyRoutes(agents);
});

test('agent instructions keep the project-specific workflow sections', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /## Context \/ CodeGraph/);
    assert.match(content, /## Validation/);
    assert.match(content, /## Git/);
    assert.match(content, /## Completion/);
    assert.match(content, /当前上下文不足且需要新增代码理解证据时，优先使用 `codegraph explore`/);
    assert.match(content, /项目已有针对当前改动的验证入口时优先使用，不自行创建等价验证流程。/);
    assert.match(content, /每个独立 issue \/ spec 对应一个交付 commit/);
    assert.match(content, /commit 后报告 hash，以及本次执行的主要验证及结果。/);
  }
});

test('context guidance is compact and evidence-first', () => {
  for (const content of [agents, templateAgents]) {
    assert.match(content, /有当前 issue \/ spec 时先读它；否则从用户问题和最相关的 symbol \/ path 开始。/);
    assert.match(content, /只围绕当前未决问题扩展上下文；README、package、tests、docs 按需读取。/);
    assert.match(content, /当前上下文已有充分且未过时的证据时，不做等价重复读取。/);
    assert.doesNotMatch(content, /仓库内代码理解首先使用|broad grep\/read/);
  }
});

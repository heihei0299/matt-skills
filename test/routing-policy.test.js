import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// AGENTS.md is the single policy source and the self-hosted workspace file is
// what target projects receive. These tests therefore guard delegation shape and
// legacy routing removal, not exact prose: wording edits must not require test edits.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');

function assertNoLegacyRoutes(content) {
  assert.doesNotMatch(content, /## Workflow|## 路由|## Security/);
  assert.doesNotMatch(content, /外部调研|原型 \/ PoC|简单修改 → 直接实现|TDD \/ 集成测试|代码审查|设计质询|领域建模|无法归类/);
}

test('workspace instructions delegate to the global AGENTS.md', () => {
  assert.ok(agents.trim().length > 0);
  assert.match(agents.split('\n')[0], /全局 `AGENTS\.md`/);
  assertNoLegacyRoutes(agents);
});

test('distributed AGENTS.md is the workspace policy file itself', () => {
  assert.equal(templateAgents, agents);
  assertNoLegacyRoutes(templateAgents);
});

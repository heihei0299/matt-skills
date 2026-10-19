import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Commands, agents, and prompts are workspace-only harness conveniences. The
// harness directories are not versioned, so a clean checkout cannot assert their
// contents; what must hold everywhere is that the distributed template carries
// only the basic framework while skills are discovered from .agents/skills.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

test('workspace-only commands, agents, and prompts are not projected into the template', () => {
  for (const rel of ['.opencode/commands', '.opencode/agents', '.pi/agents', '.pi/prompts', '.codex']) {
    assert.equal(existsSync(root(path.join('template', rel))), false, `${rel} should not be projected`);
  }
});

test('template keeps the basic harness framework', () => {
  assert.ok(existsSync(root('template/.opencode/CONTEXT.md')), 'template/.opencode/CONTEXT.md');
  assert.ok(existsSync(root('template/.pi/CONTEXT.md')), 'template/.pi/CONTEXT.md');
  assert.ok(existsSync(root('template/.opencode/docs/agents')), 'template/.opencode/docs/agents');
});

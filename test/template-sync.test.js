import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard the template snapshot: template/ is what init copies into target
// repos, so every one of the 8 template items must stay in sync with the
// workspace copies at the repo root. Edit the workspace, then re-sync.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('template/.agents/skills mirrors the workspace skills directory', () => {
  const wsFiles = readDirRecursive(root('.agents/skills'));
  const tmplFiles = readDirRecursive(root('template/.agents/skills'));
  assert.deepEqual(
    tmplFiles.map((f) => path.relative(root('template/.agents/skills'), f)),
    wsFiles.map((f) => path.relative(root('.agents/skills'), f)),
  );
  for (const f of wsFiles) {
    const rel = path.relative(root('.agents/skills'), f);
    assert.equal(
      readFileSync(root(path.join('template/.agents/skills', rel)), 'utf8'),
      readFileSync(f, 'utf8'),
      `template/.agents/skills/${rel} out of sync`,
    );
  }
});

test('template/AGENTS.md mirrors the root AGENTS.md', () => {
  assert.equal(readFileSync(root('template/AGENTS.md'), 'utf8'), readFileSync(root('AGENTS.md'), 'utf8'));
});

test('template/CONTEXT.md mirrors the root CONTEXT.md', () => {
  assert.equal(readFileSync(root('template/CONTEXT.md'), 'utf8'), readFileSync(root('CONTEXT.md'), 'utf8'));
});

test('template/docs/agents mirrors the root docs/agents', () => {
  for (const f of DOC_AGENTS) {
    assert.equal(
      readFileSync(root(path.join('template/docs/agents', f)), 'utf8'),
      readFileSync(root(path.join('docs/agents', f)), 'utf8'),
      `template/docs/agents/${f} out of sync`,
    );
  }
});

test('template/ carries exactly the 8 inheritable items, nothing else', () => {
  const entries = readdirSync(root('template')).sort();
  assert.deepEqual(entries, ['.agents', 'AGENTS.md', 'CONTEXT.md', 'docs']);
});

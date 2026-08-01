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

// Config-repo positioning: template/ ships config + proprietary skills only.
// The 22 upstream skills (engineering/productivity) are fetched manually into
// target repos per README, so they must NOT be copied into template/.
const PROPRIETARY_SKILLS = ['tdd-implement', 'grill-to-spec'];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('template/.agents/skills mirrors the proprietary skills only', () => {
  for (const skill of PROPRIETARY_SKILLS) {
    const wsFiles = readDirRecursive(root(path.join('.agents/skills', skill)));
    const tmplFiles = readDirRecursive(root(path.join('template/.agents/skills', skill)));
    assert.deepEqual(
      tmplFiles.map((f) => path.relative(root(path.join('template/.agents/skills', skill)), f)),
      wsFiles.map((f) => path.relative(root(path.join('.agents/skills', skill)), f)),
      `${skill} file listing out of sync`,
    );
    for (const f of wsFiles) {
      const rel = path.relative(root(path.join('.agents/skills', skill)), f);
      assert.equal(
        readFileSync(root(path.join('template/.agents/skills', skill, rel)), 'utf8'),
        readFileSync(f, 'utf8'),
        `template/.agents/skills/${skill}/${rel} out of sync`,
      );
    }
  }
});

test('template/.agents/skills carries no upstream skills', () => {
  const wsSkills = readdirSync(root('.agents/skills')).sort();
  const tmplSkills = readdirSync(root('template/.agents/skills')).sort();
  assert.deepEqual(tmplSkills, [...PROPRIETARY_SKILLS].sort());
  for (const skill of wsSkills) {
    if (PROPRIETARY_SKILLS.includes(skill)) continue;
    assert.ok(
      !tmplSkills.includes(skill),
      `upstream skill ${skill} must not be copied into template/ (fetch it per README instead)`,
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

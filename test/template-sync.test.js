import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, MAP_DOCS, MAP_AGENTS, normalize } from './mirror-utils.js';

// Guard the template snapshot: template/ is what init copies into target
// repos. The workspace mirrors into template/ with a path mapping (skills,
// discipline docs and glossary land under .opencode/, AGENTS.md at the top
// level), so the mirror checks normalize the template copies back to
// workspace paths before comparing. Edit the workspace, then re-sync.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

// Config-repo positioning: template/ ships config + proprietary skills only.
// The 22 upstream skills (engineering/productivity) are fetched manually into
// target repos per README, so they must NOT be copied into template/.
// tdd-implement & grill-to-spec mirror from the workspace .agents/skills/;
// issue-audit ships standalone (its workspace source is .opencode/agents/issue-audit.md,
// not a skill directory), so it is presence-checked but not byte-mirrored.
const PROPRIETARY_SKILLS = ['tdd-implement', 'grill-to-spec'];
const TEMPLATE_ONLY_SKILLS = ['issue-audit'];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('template/.opencode/skills mirrors the proprietary skills (path-mapped)', () => {
  for (const skill of PROPRIETARY_SKILLS) {
    const wsFiles = readDirRecursive(root(path.join('.agents/skills', skill)));
    const tmplFiles = readDirRecursive(root(path.join('template/.opencode/skills', skill)));
    assert.deepEqual(
      tmplFiles.map((f) => path.relative(root(path.join('template/.opencode/skills', skill)), f)),
      wsFiles.map((f) => path.relative(root(path.join('.agents/skills', skill)), f)),
      `${skill} file listing out of sync`,
    );
    for (const f of wsFiles) {
      const rel = path.relative(root(path.join('.agents/skills', skill)), f);
      assert.equal(
        normalize(readFileSync(root(path.join('template/.opencode/skills', skill, rel)), 'utf8'), MAP_SKILL),
        readFileSync(f, 'utf8'),
        `template/.opencode/skills/${skill}/${rel} out of sync`,
      );
    }
  }
});

test('template/.opencode/skills carries no upstream skills', () => {
  const wsSkills = readdirSync(root('.agents/skills')).sort();
  const tmplSkills = readdirSync(root('template/.opencode/skills')).sort();
  assert.deepEqual(tmplSkills, [...PROPRIETARY_SKILLS, ...TEMPLATE_ONLY_SKILLS].sort());
  for (const skill of wsSkills) {
    if (PROPRIETARY_SKILLS.includes(skill)) continue;
    assert.ok(
      !tmplSkills.includes(skill),
      `upstream skill ${skill} must not be copied into template/ (fetch it per README instead)`,
    );
  }
});

test('template/.opencode/skills/issue-audit exists standalone', () => {
  assert.ok(statSync(root('template/.opencode/skills/issue-audit/SKILL.md')).isFile());
});

test('template/AGENTS.md mirrors the root AGENTS.md (path-mapped)', () => {
  assert.equal(
    normalize(readFileSync(root('template/AGENTS.md'), 'utf8'), MAP_AGENTS),
    readFileSync(root('AGENTS.md'), 'utf8'),
  );
});

test('template/.opencode/CONTEXT.md mirrors the root CONTEXT.md', () => {
  assert.equal(
    readFileSync(root('template/.opencode/CONTEXT.md'), 'utf8'),
    readFileSync(root('CONTEXT.md'), 'utf8'),
  );
});

test('template/.opencode/docs/agents mirrors the root docs/agents (path-mapped)', () => {
  for (const f of DOC_AGENTS) {
    assert.equal(
      normalize(readFileSync(root(path.join('template/.opencode/docs/agents', f)), 'utf8'), MAP_DOCS),
      readFileSync(root(path.join('docs/agents', f)), 'utf8'),
      `template/.opencode/docs/agents/${f} out of sync`,
    );
  }
});

test('template/ carries exactly the inheritable items, nothing else', () => {
  const entries = readdirSync(root('template')).sort();
  assert.deepEqual(entries, ['.opencode', 'AGENTS.md']);
});

test('template/ internal markdown links resolve (except upstream skill refs)', () => {
  const mdFiles = [];
  const walk = (p) => {
    for (const entry of readdirSync(p)) {
      const full = path.join(p, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.md')) mdFiles.push(full);
    }
  };
  walk(root('template'));
  const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  for (const f of mdFiles) {
    const content = readFileSync(f, 'utf8');
    for (const m of content.matchAll(linkRe)) {
      const href = m[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      if (href.startsWith('.agents/')) continue; // hardcoded upstream skill ref, fetched at init
      const target = path.resolve(path.dirname(f), decodeURIComponent(href.split('#')[0]));
      assert.ok(statSync(target).isFile(), `broken link in ${path.relative(dir, f)}: ${href}`);
    }
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_ROOT = path.join(ROOT, '.agents/skills/tdd-implement');

function markdownFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...markdownFiles(full));
    else if (name.endsWith('.md')) files.push(full);
  }
  return files;
}

function resolveLink(source, target) {
  const withoutAnchor = target.split('#', 1)[0];
  if (!withoutAnchor || /^(?:https?:|mailto:)/.test(withoutAnchor)) return null;
  if (withoutAnchor.startsWith('.agents/')) return path.join(ROOT, withoutAnchor);
  return path.resolve(path.dirname(source), withoutAnchor);
}

test('all local markdown references in tdd-implement resolve', () => {
  const missing = [];
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const file of markdownFiles(SKILL_ROOT)) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(linkPattern)) {
      const target = resolveLink(file, match[1]);
      if (target && !existsSync(target)) {
        missing.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('obsolete tdd-implement reference files are not referenced anywhere in the skill', () => {
  const content = markdownFiles(SKILL_ROOT)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(content, /(?:contract|red-green|stages)\.md/);
});

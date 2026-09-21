import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSkillNames } from './selection.js';
import { loadSkillSet } from './config.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const DEFAULT_PATH = path.join(ROOT, 'config', 'default.json');
let DEFAULT_SKILLS = null;

async function loadDefaultSkills() {
  if (!DEFAULT_SKILLS) DEFAULT_SKILLS = await loadSkillSet(DEFAULT_PATH, 'default');
  return DEFAULT_SKILLS;
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    fields[m[1]] = value;
  }
  return fields;
}

export async function listAvailableSkillNames() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.endsWith('.bak'))
    .filter((entry) => entry.name !== 'skill-creator' && entry.name !== '.git')
    .map((entry) => entry.name);
}

export async function listSkillNames({ onlyProgramming = false } = {}) {
  return resolveSkillNames({
    availableNames: await listAvailableSkillNames(),
    mode: onlyProgramming ? 'default' : 'all',
    defaults: onlyProgramming ? await loadDefaultSkills() : [],
  });
}

export async function listSkills({ onlyProgramming = false } = {}) {
  const skills = [];
  for (const name of await listSkillNames({ onlyProgramming })) {
    let content;
    try {
      content = await readFile(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
    } catch {
      continue;
    }
    const { description } = parseFrontmatter(content);
    if (description) skills.push({ name, description });
  }
  return skills.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

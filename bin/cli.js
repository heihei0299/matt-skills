#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills');

const HELP = `matt-skills — install and manage this skill collection

Usage:
  matt-skills list [--json]   List available skills and their descriptions
  matt-skills --help          Show this help
`;

function parseFrontmatter(text) {
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

async function listSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let content;
    try {
      content = await readFile(path.join(SKILLS_DIR, entry.name, 'SKILL.md'), 'utf8');
    } catch {
      continue; // directory without SKILL.md is not a skill
    }
    const { name, description } = parseFrontmatter(content);
    if (name && description) skills.push({ name, description });
  }
  return skills.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(HELP);
    return;
  }

  const [command, ...rest] = args;

  if (command === 'list') {
    const skills = await listSkills();
    if (rest.includes('--json')) {
      process.stdout.write(`${JSON.stringify(skills, null, 2)}\n`);
    } else {
      for (const skill of skills) {
        process.stdout.write(`${skill.name} — ${skill.description}\n`);
      }
    }
    return;
  }

  process.stderr.write(HELP);
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});

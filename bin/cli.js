#!/usr/bin/env node
import { readdir, readFile, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills');

const HELP = `matt-skills — install and manage this skill collection

Usage:
  matt-skills list [--json]     List available skills and their descriptions
  matt-skills install           Interactively pick skills, then install them
      --all                     Install every skill without prompting
      --dest <path>             Install into an arbitrary directory
      --force                   Overwrite skills that already exist
  matt-skills --help            Show this help
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

function parseInstallArgs(args) {
  let dest;
  let destSeen = false;
  let force = false;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      destSeen = true;
      dest = args[++i];
    } else if (arg.startsWith('--dest=')) {
      destSeen = true;
      dest = arg.slice('--dest='.length);
    } else if (arg === '--force') force = true;
    else if (arg === '--all') all = true;
  }
  if (destSeen && (dest === undefined || dest === '' || dest.startsWith('--'))) {
    throw new Error('--dest 需要路径参数');
  }
  return { dest, force, all };
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function pickSkills(skills) {
  if (!process.stdin.isTTY) {
    process.stdout.write('非交互环境，请用 --all 跳过勾选直接安装全部技能\n');
    return null;
  }
  const { selection } = await prompts({
    type: 'multiselect',
    name: 'selection',
    message: '选择要安装的技能（空格勾选，回车确认）',
    choices: skills.map((s) => ({ title: s.name, value: s.name, description: s.description })),
    instructions: false,
  });
  return selection;
}

async function installCommand({ dest, force, all }) {
  const skills = await listSkills();
  const dir = dest ? path.resolve(process.cwd(), dest) : path.resolve(process.cwd(), '.agents', 'skills');
  let selected = skills.map((s) => s.name);
  if (!all) {
    selected = await pickSkills(skills);
    if (selected === null) {
      process.exitCode = 1; // non-TTY: fail loudly instead of a silent no-op
      return;
    }
    if (selected === undefined) {
      process.stdout.write('已取消，未安装任何技能\n');
      return;
    }
    if (selected.length === 0) {
      process.stdout.write('未选择任何技能，未安装\n');
      return;
    }
  }
  const wanted = new Set(selected);
  let installed = 0;
  let skipped = 0;
  for (const skill of skills) {
    if (!wanted.has(skill.name)) continue;
    const dst = path.join(dir, skill.name);
    if (!force && (await pathExists(dst))) {
      skipped++;
      continue;
    }
    await cp(path.join(SKILLS_DIR, skill.name), dst, { recursive: true });
    installed++;
  }
  process.stdout.write(`已装 ${installed}、跳过 ${skipped}\n`);
  process.stdout.write(`目标路径：${dir}\n`);
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

  if (command === 'install') {
    await installCommand(parseInstallArgs(rest));
    return;
  }

  process.stderr.write(HELP);
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});

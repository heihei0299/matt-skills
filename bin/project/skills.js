import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isSafeRealPath, pathExists, sameTree } from './filesystem.js';

export const TOOLS = ['codex', 'pi', 'opencode', 'claude'];

export const PROJECT_SKILLS_DIR = '.agents/skills';

export const PROJECT_DIRS = {
  codex: PROJECT_SKILLS_DIR,
  pi: PROJECT_SKILLS_DIR,
  opencode: PROJECT_SKILLS_DIR,
  claude: PROJECT_SKILLS_DIR,
};

export const LEGACY_PROJECT_SKILL_DIRS = ['.pi/skills', '.opencode/skills', '.claude/skills'];

const GLOBAL_DIRS = {
  codex: '.codex/skills',
  pi: '.pi/agent/skills',
  opencode: '.config/opencode/skills',
  claude: '.claude/skills',
};

export function projectSkillTargets(target) {
  const targets = new Map();
  for (const tool of TOOLS) {
    const dir = path.resolve(target, PROJECT_DIRS[tool]);
    if (!targets.has(dir)) targets.set(dir, { tool, dir });
  }
  return [...targets.values()];
}

export function toolDir(tool, global) {
  if (global) return path.join(os.homedir(), GLOBAL_DIRS[tool]);
  return path.resolve(process.cwd(), PROJECT_DIRS[tool]);
}

export async function copySkills({ sourceDir, targetDir, skillNames, force = true }) {
  let installed = 0;
  let skipped = 0;
  for (const name of skillNames) {
    const source = path.join(sourceDir, name);
    const destination = path.join(targetDir, name);
    if (path.resolve(source) === path.resolve(destination)) continue;
    if (!force && await pathExists(destination)) {
      skipped++;
      continue;
    }
    await cp(source, destination, { recursive: true, force: true });
    installed++;
  }
  return { installed, skipped };
}

export async function distributeProjectSkills({ target, sourceDir, skillNames }) {
  for (const { dir } of projectSkillTargets(target)) {
    await mkdir(dir, { recursive: true });
    await copySkills({ sourceDir, targetDir: dir, skillNames });
  }
}

export async function syncProjectSkills({ target, sourceDir, skillNames, distributableSkillNames, repoLocalSkills }) {
  const skillTargets = projectSkillTargets(target);
  const skillsDir = path.resolve(target, PROJECT_DIRS.codex);
  const legacyLocations = LEGACY_PROJECT_SKILL_DIRS.map((relative) => ({
    dir: path.resolve(target, relative),
    label: relative,
    isWorkspaceSource: false,
  }));
  const preservedRepoLocal = [];
  const preserveLocations = [
    ...skillTargets.map(({ tool, dir }) => ({
      dir,
      label: PROJECT_DIRS[tool],
      isWorkspaceSource: path.resolve(dir) === path.resolve(sourceDir),
    })),
    ...legacyLocations,
  ];
  for (const { dir } of skillTargets) await mkdir(dir, { recursive: true });
  for (const name of repoLocalSkills) {
    for (const location of preserveLocations) {
      if (!location.isWorkspaceSource && await pathExists(path.join(location.dir, name))) {
        preservedRepoLocal.push(`${location.label}/${name}`);
      }
    }
  }
  let installed = 0;
  let updated = 0;
  for (const { dir } of skillTargets) {
    for (const name of skillNames) {
      const source = path.join(sourceDir, name);
      const destination = path.join(dir, name);
      if (path.resolve(source) === path.resolve(destination)) {
        if (path.resolve(dir) === skillsDir) updated++;
        continue;
      }
      const exists = await pathExists(destination);
      if (exists) {
        await rm(destination, { recursive: true, force: true });
        await cp(source, destination, { recursive: true, force: true });
        if (path.resolve(dir) === skillsDir) updated++;
      } else {
        await cp(source, destination, { recursive: true, force: true });
        if (path.resolve(dir) === skillsDir) installed++;
      }
    }
  }
  const cleanedLegacy = [];
  for (const location of legacyLocations) {
    let entries;
    try {
      if (!await isSafeRealPath(location.dir)) continue;
      const locationInfo = await lstat(location.dir);
      if (!locationInfo.isDirectory()) continue;
      entries = await readdir(location.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '.git' || entry.name.endsWith('.bak')) continue;
      if (!distributableSkillNames.includes(entry.name)) continue;
      const source = path.join(sourceDir, entry.name);
      const destination = path.join(location.dir, entry.name);
      try {
        if (await sameTree(source, destination)) {
          await rm(destination, { recursive: true, force: true });
          cleanedLegacy.push(`${location.label}/${entry.name}`);
        }
      } catch {}
    }
  }
  try {
    const piSettings = path.join(target, '.pi/settings.json');
    if (await pathExists(piSettings)) {
      const txt = await readFile(piSettings, 'utf8');
      if (txt.includes('.opencode/skills') || txt.includes('../.opencode')) {
        await writeFile(piSettings, '{}\n');
      }
    }
  } catch {}
  return { installed, updated, cleanedLegacy, preservedRepoLocal };
}

#!/usr/bin/env node
import { cp, mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Static template wording lives in config/template-src/; this script only maps
// sources to their template destinations. Editing template text is a content
// change there, never a change to this script.
const TEMPLATE_FILES = [
  ['config/template-src/PROJECT.md', 'template/PROJECT.md'],
  ['config/template-src/pi-skills.README.md', 'template/.pi/skills/README.md'],
  ['config/template-src/opencode-skills.README.md', 'template/.opencode/skills/README.md'],
];

// Shared workspace documents projected into each harness template. AGENTS.md is
// the single policy source: the workspace file itself is what target projects get.
const TEMPLATE_PROJECTIONS = [
  ['AGENTS.md', 'template/AGENTS.md'],
  ['CONTEXT.md', 'template/.opencode/CONTEXT.md'],
  ['CONTEXT.md', 'template/.pi/CONTEXT.md'],
  ['docs/agents', 'template/.opencode/docs/agents'],
  ['docs/agents', 'template/.pi/docs/agents'],
];

// Harness skill dirs stay empty in the snapshot; skills are assembled by the CLI.
const PLACEHOLDER_DIRS = ['template/.pi/skills', 'template/.opencode/skills'];

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function assertSources() {
  const sources = [...new Set([...TEMPLATE_FILES, ...TEMPLATE_PROJECTIONS].map(([source]) => source))];
  const missing = [];
  for (const source of sources) {
    if (!await exists(path.join(ROOT, source))) missing.push(source);
  }
  if (missing.length) throw new Error(`missing template source(s): ${missing.join(', ')}`);
}

async function copySource(src, dest, stage) {
  const destination = path.join(stage, path.relative('template', dest));
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(ROOT, src), destination, { recursive: true });
}

async function main() {
  await assertSources();
  const temporary = await mkdtemp(path.join(ROOT, '.matt-skills-template-'));
  const stage = path.join(temporary, 'snapshot');
  const backup = path.join(temporary, 'previous');
  const target = path.join(ROOT, 'template');
  let backedUp = false;
  let preserveRecovery = false;
  try {
    for (const dir of PLACEHOLDER_DIRS) {
      const destination = path.join(stage, path.relative('template', dir));
      await mkdir(destination, { recursive: true });
      await writeFile(path.join(destination, '.gitkeep'), '');
    }
    for (const [src, dest] of TEMPLATE_FILES) await copySource(src, dest, stage);
    for (const [src, dest] of TEMPLATE_PROJECTIONS) await copySource(src, dest, stage);
    try {
      await rename(target, backup);
      backedUp = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(stage, target);
    } catch (error) {
      if (backedUp) {
        try {
          await rename(backup, target);
        } catch (rollbackError) {
          preserveRecovery = true;
          throw new Error(`template replacement failed: ${error.message}; recovery failed: ${rollbackError.message}; previous snapshot: ${backup}`);
        }
      }
      throw error;
    }
    console.log('template built: skeleton');
  } finally {
    if (!preserveRecovery) await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });

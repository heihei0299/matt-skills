import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_DIRS, PROJECT_SKILLS_DIR } from '../bin/project/skills.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const cliSource = fs.readFileSync(CLI, 'utf8');

const COMMANDS = {
  init: 'runInit',
  sync: 'runSync',
  install: 'runInstall',
  list: 'runList',
  check: 'runCheck',
};

test('cli dispatches through the command modules', () => {
  for (const [command, entryPoint] of Object.entries(COMMANDS)) {
    assert.ok(fs.existsSync(path.join(ROOT, 'bin', 'commands', `${command}.js`)));
    assert.match(cliSource, new RegExp(`import \\{ ${entryPoint} \\} from ['"]\\./commands/${command}\\.js['"]`));
  }
});

test('cli keeps project and skill implementation out of the composition root', () => {
  const fsImport = cliSource.match(/import \{([^}]+)\} from 'node:fs\/promises';/);
  assert.ok(fsImport);
  assert.deepEqual(fsImport[1].split(',').map((name) => name.trim()).filter(Boolean), ['readFile']);
  assert.doesNotMatch(cliSource, /from ['"]\.\/project\/(?:template|agents|filesystem)\.js['"]/);
  assert.doesNotMatch(cliSource, /from ['"]\.\/skills\/discovery\.js['"]/);
});

test('project skill targets have one canonical workspace directory', () => {
  assert.equal(PROJECT_SKILLS_DIR, '.agents/skills');
  assert.deepEqual(new Set(Object.values(PROJECT_DIRS)), new Set([PROJECT_SKILLS_DIR]));
  assert.match(cliSource, /import \{ PROJECT_SKILLS_DIR \} from ['"]\.\/project\/skills\.js['"];/);
  assert.doesNotMatch(cliSource, /PROJECT_SKILL_DIRS/);
});

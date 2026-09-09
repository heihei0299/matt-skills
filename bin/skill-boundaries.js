import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'proprietary.json');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

function toUniqueSet(value, key) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) {
    throw new Error(`invalid proprietary classification: ${key} must be a unique array`);
  }
  return new Set(value);
}

export const PROPRIETARY_SKILLS = toUniqueSet(config.all, 'all');
export const DISTRIBUTABLE_PROPRIETARY_SKILLS = toUniqueSet(config.distributable, 'distributable');
export const REPO_LOCAL_SKILLS = toUniqueSet(config.repoLocal, 'repoLocal');
export const DEFAULT_PROPRIETARY_SKILLS = toUniqueSet(config.default, 'default');

const classified = new Set([...DISTRIBUTABLE_PROPRIETARY_SKILLS, ...REPO_LOCAL_SKILLS]);
const missing = [...PROPRIETARY_SKILLS].filter((name) => !classified.has(name));
const extra = [...classified].filter((name) => !PROPRIETARY_SKILLS.has(name));
const overlap = [...DISTRIBUTABLE_PROPRIETARY_SKILLS].filter((name) => REPO_LOCAL_SKILLS.has(name));
const invalidDefaults = [...DEFAULT_PROPRIETARY_SKILLS].filter((name) => !DISTRIBUTABLE_PROPRIETARY_SKILLS.has(name));
if (missing.length || extra.length || overlap.length || invalidDefaults.length) {
  throw new Error(
    `invalid proprietary classification: missing=${missing.join(',')} extra=${extra.join(',')} ` +
    `overlap=${overlap.join(',')} defaults=${invalidDefaults.join(',')}`,
  );
}

export function isProprietarySkill(name) {
  return PROPRIETARY_SKILLS.has(name);
}

export function isDistributableProprietarySkill(name) {
  return DISTRIBUTABLE_PROPRIETARY_SKILLS.has(name);
}

export function isRepoLocalSkill(name) {
  return REPO_LOCAL_SKILLS.has(name);
}

export function isDefaultProprietarySkill(name) {
  return DEFAULT_PROPRIETARY_SKILLS.has(name);
}

export function isDefaultProgrammingSkill(name, engineering, required) {
  return (
    DEFAULT_PROPRIETARY_SKILLS.has(name) ||
    engineering.has(name) ||
    (required && required.has(name))
  );
}

export function isDistributableSkill(name, knownNames) {
  if (!knownNames) return isDistributableProprietarySkill(name);
  const known = knownNames instanceof Set ? knownNames : new Set(knownNames);
  return known.has(name) && !REPO_LOCAL_SKILLS.has(name);
}

import { readFile } from 'node:fs/promises';

export async function loadSkillSet(file, label) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`unable to read ${label} skill config: ${error.message}`);
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid ${label} skill config: ${error.message}`);
  }
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new Error(`invalid ${label} skill config: expected an array of strings`);
  }
  return new Set(value);
}

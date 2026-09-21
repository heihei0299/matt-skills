import { readdir, readFile, lstat, stat } from 'node:fs/promises';
import path from 'node:path';

export async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function isSafeRealPath(targetPath) {
  const absolute = path.resolve(targetPath);
  const root = path.parse(absolute).root;
  let current = root;
  for (const segment of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function sameMetadata(left, right) {
  return (left.mode & 0o7777) === (right.mode & 0o7777)
    && left.uid === right.uid
    && left.gid === right.gid;
}

export async function sameTree(left, right) {
  try {
    const [leftInfo, rightInfo] = await Promise.all([lstat(left), lstat(right)]);
    if (leftInfo.isSymbolicLink() || rightInfo.isSymbolicLink()) return false;
    if (leftInfo.isDirectory() !== rightInfo.isDirectory()) return false;
    if (leftInfo.isDirectory()) {
      const [leftEntries, rightEntries] = await Promise.all([
        readdir(left, { withFileTypes: true }),
        readdir(right, { withFileTypes: true }),
      ]);
      if (!sameMetadata(leftInfo, rightInfo) || leftEntries.length !== rightEntries.length) return false;
      const rightNames = new Set(rightEntries.map((entry) => entry.name));
      for (const entry of leftEntries) {
        if (!rightNames.has(entry.name) || !await sameTree(path.join(left, entry.name), path.join(right, entry.name))) {
          return false;
        }
      }
      return true;
    }
    if (leftInfo.isFile() && rightInfo.isFile()) {
      return (await readFile(left)).equals(await readFile(right)) && sameMetadata(leftInfo, rightInfo);
    }
    return false;
  } catch {
    return false;
  }
}

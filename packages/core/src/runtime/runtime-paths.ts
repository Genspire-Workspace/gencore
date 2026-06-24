import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveFileDir(fileUrl: string): string {
  return dirname(fileURLToPath(fileUrl));
}

export function resolveNearestAncestorDir(fileUrl: string, targetDirName: string): string {
  let dir = resolveFileDir(fileUrl);

  while (true) {
    if (basename(dir) === targetDirName) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return resolveFileDir(fileUrl);
    }

    dir = parent;
  }
}

export function resolveNearestSrcDir(fileUrl: string): string {
  return resolveNearestAncestorDir(fileUrl, "src");
}

export function resolveNearestPackageRoot(fileUrl: string): string {
  let dir = resolveFileDir(fileUrl);

  while (true) {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return resolveFileDir(fileUrl);
    }

    dir = parent;
  }
}

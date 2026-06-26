// file: apps\skills\computer-use\scripts\shared.ts

import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { AiError } from "../../../../packages/ai/src/errors/ai-error.js";

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
  ".gif",
]);

export const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".flac",
]);

const DEFAULT_TRUSTED_ROOT = path.resolve("data/test-directory");

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function normalizeForComparison(input: string): string {
  const normalizedPath = path.resolve(input);

  return process.platform === "win32"
    ? normalizedPath.toLowerCase()
    : normalizedPath;
}

function includesTraversalSegment(input: string): boolean {
  return input
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "..");
}

function assertSafeInputPath(input: string, label: string): void {
  if (!input.trim()) {
    throw new AiError(`${label} path is required.`);
  }

  if (includesTraversalSegment(input)) {
    throw new AiError(`${label} path '${input}' must not contain '..'.`);
  }
}

async function ensurePathWithinRoot(
  requestedPath: string,
  rootPath: string,
  label: string,
): Promise<string> {
  const resolvedRootPath = path.resolve(rootPath);
  const realRootPath = await realpath(resolvedRootPath);
  const resolvedRequestedPath = path.resolve(requestedPath);
  const realRequestedPath = await realpath(resolvedRequestedPath);
  const relativePath = path.relative(realRootPath, realRequestedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new AiError(
      `${label} '${resolvedRequestedPath}' must stay within '${resolvedRootPath}'.`,
    );
  }

  const comparableRootPath = normalizeForComparison(realRootPath);
  const comparableRequestedPath = normalizeForComparison(realRequestedPath);

  if (
    comparableRequestedPath !== comparableRootPath &&
    !comparableRequestedPath.startsWith(`${comparableRootPath}${path.sep}`)
  ) {
    throw new AiError(
      `${label} '${resolvedRequestedPath}' must stay within '${resolvedRootPath}'.`,
    );
  }

  return realRequestedPath;
}

export function getTrustedRootDirectory(): string {
  const configuredRoot = process.env.AI_COMPUTER_USE_TRUSTED_ROOT;

  return configuredRoot?.trim()
    ? path.resolve(configuredRoot)
    : DEFAULT_TRUSTED_ROOT;
}

export async function resolveTrustedDirectory(input: unknown): Promise<string> {
  const directory = typeof input === "string" && input.trim()
    ? input.trim()
    : getTrustedRootDirectory();

  assertSafeInputPath(directory, "Directory");

  return await ensurePathWithinRoot(
    path.isAbsolute(directory)
      ? directory
      : path.resolve(getTrustedRootDirectory(), directory),
    getTrustedRootDirectory(),
    "Directory",
  );
}

export async function resolveTrustedPath(
  rootDirectory: string,
  input: unknown,
  label: string,
): Promise<string> {
  if (typeof input !== "string") {
    throw new AiError(`${label} path is required.`);
  }

  const requestedPath = input.trim();
  assertSafeInputPath(requestedPath, label);

  return await ensurePathWithinRoot(
    path.isAbsolute(requestedPath)
      ? requestedPath
      : path.resolve(rootDirectory, requestedPath),
    rootDirectory,
    label,
  );
}

export async function listFilesRecursive(rootDirectory: string): Promise<string[]> {
  const results: string[] = [];

  async function visit(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        results.push(absolutePath);
      }
    }
  }

  await visit(rootDirectory);

  return results.sort((left, right) => left.localeCompare(right));
}

export function toRelativePath(rootDirectory: string, absolutePath: string): string {
  return path.relative(rootDirectory, absolutePath).replaceAll("\\", "/");
}

export async function readFileStats(filePath: string): Promise<{
  size: number;
  extension: string;
}> {
  const fileStats = await stat(filePath);

  return {
    size: fileStats.size,
    extension: path.extname(filePath).toLowerCase(),
  };
}

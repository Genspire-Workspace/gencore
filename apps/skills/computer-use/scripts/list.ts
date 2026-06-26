// file: apps\skills\computer-use\scripts\list.ts

import path from "node:path";
import { defineAiTool } from "../../../../packages/ai/src/tools/define-ai-tool.js";
import {
  listFilesRecursive,
  resolveTrustedDirectory,
  toRecord,
  toRelativePath,
} from "./shared.js";

function normalizeExtensions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const extensions = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .map((entry) => entry.startsWith(".") ? entry : `.${entry}`);

  return extensions.length > 0 ? extensions : undefined;
}

export const listTool = defineAiTool({
  name: "list",
  description: "Lists files recursively in a directory, optionally filtered by extension or partial name.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Absolute or relative directory path to inspect.",
      },
      extensions: {
        type: "array",
        description: "Optional file extensions to filter, such as ['.png', '.jpg'] or ['pdf'].",
        items: { type: "string" },
      },
      nameIncludes: {
        type: "string",
        description: "Optional case-insensitive substring filter for filenames.",
      },
    },
    required: ["directory"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const directory = await resolveTrustedDirectory(input.directory);
    const extensions = normalizeExtensions(input.extensions);
    const nameIncludes = typeof input.nameIncludes === "string" && input.nameIncludes.trim()
      ? input.nameIncludes.trim().toLowerCase()
      : undefined;
    const files = await listFilesRecursive(directory);
    const items = files
      .filter((filePath) => {
        if (extensions && !extensions.includes(path.extname(filePath).toLowerCase())) {
          return false;
        }

        if (nameIncludes && !path.basename(filePath).toLowerCase().includes(nameIncludes)) {
          return false;
        }

        return true;
      })
      .map((filePath) => ({
        name: path.basename(filePath),
        relativePath: toRelativePath(directory, filePath),
      }));

    return {
      directory,
      items,
    };
  },
});

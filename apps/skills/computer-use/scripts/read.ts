// file: apps\skills\computer-use\scripts\read.ts

import path from "node:path";
import { defineAiTool } from "../../../../packages/ai/src/domain/tools/define-ai-tool.js";
import {
  readFileStats,
  resolveTrustedDirectory,
  resolveTrustedPath,
  toRecord,
  toRelativePath,
} from "./shared.js";

export const readTool = defineAiTool({
  name: "read",
  description: "Reads file metadata and optional text preview for a file inside a directory.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Absolute or relative directory path used as the base for relative paths.",
      },
      filePath: {
        type: "string",
        description: "Absolute or relative file path to inspect.",
      },
      readAsText: {
        type: "boolean",
        description: "When true, returns a short UTF-8 text preview.",
      },
    },
    required: ["directory", "filePath"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const directory = await resolveTrustedDirectory(input.directory);
    const filePathValue = typeof input.filePath === "string" && input.filePath.trim()
      ? input.filePath.trim()
      : "";

    if (!filePathValue) {
      throw new Error("read requires a filePath.");
    }

    const absolutePath = await resolveTrustedPath(directory, filePathValue, "File");
    const stats = await readFileStats(absolutePath);
    const readAsText = input.readAsText === true;
    let preview: string | undefined;

    if (readAsText) {
      const text = await Bun.file(absolutePath).text();
      preview = text.slice(0, 500);
    }

    return {
      directory,
      file: {
        name: path.basename(absolutePath),
        relativePath: toRelativePath(directory, absolutePath),
        size: stats.size,
        extension: stats.extension,
        preview,
      },
    };
  },
});

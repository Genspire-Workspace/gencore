// file: apps\skills\computer-use\scripts\bash.ts

import path from "node:path";
import { AiError } from "../../../../packages/ai/src/errors/ai-error.js";
import { defineAiTool } from "../../../../packages/ai/src/domain/tools/define-ai-tool.js";
import {
  AUDIO_EXTENSIONS,
  resolveTrustedDirectory,
  resolveTrustedPath,
  toRecord,
  toRelativePath,
} from "./shared.js";

function parseStartProcessFilePath(command: string): string {
  const match = command.match(/^Start-Process\s+-FilePath\s+(.+)$/i);

  if (!match) {
    throw new AiError(
      "bash only allows 'Start-Process -FilePath <audio-file>' commands for this skill.",
    );
  }

  const rawPath = match[1]?.trim() ?? "";

  if (!rawPath) {
    throw new AiError("bash requires a file path.");
  }

  if (
    (rawPath.startsWith("\"") && rawPath.endsWith("\"")) ||
    (rawPath.startsWith("'") && rawPath.endsWith("'"))
  ) {
    const quotedPath = rawPath.slice(1, -1).trim();

    if (!quotedPath) {
      throw new AiError("bash requires a non-empty file path.");
    }

    return quotedPath;
  }

  if (/\s/.test(rawPath)) {
    throw new AiError("bash only accepts a single file path argument.");
  }

  return rawPath;
}

export const bashTool = defineAiTool({
  name: "bash",
  description: "Opens an audio file inside the trusted directory using Start-Process.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Absolute or relative working directory for the command.",
      },
      command: {
        type: "string",
        description: "Shell command to execute in the local environment.",
      },
    },
    required: ["directory", "command"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const directory = await resolveTrustedDirectory(input.directory);
    const command = typeof input.command === "string" && input.command.trim()
      ? input.command.trim()
      : "";

    if (!command) {
      throw new Error("bash requires a command.");
    }

    const requestedFilePath = parseStartProcessFilePath(command);
    const absoluteFilePath = await resolveTrustedPath(
      directory,
      requestedFilePath,
      "Audio file",
    );
    const normalizedExtension = path.extname(absoluteFilePath).toLowerCase();

    if (!AUDIO_EXTENSIONS.has(normalizedExtension)) {
      throw new AiError(
        `bash only allows audio files inside the trusted directory. Received '${absoluteFilePath}'.`,
      );
    }

    if (process.platform !== "win32" || process.env.AI_COMPUTER_USE_BASH_DRY_RUN === "true") {
      return {
        directory,
        command,
        openedFile: toRelativePath(directory, absoluteFilePath),
        skippedExecution: true,
      };
    }

    const escapedFilePath = absoluteFilePath.replaceAll("'", "''");
    const processResult = Bun.spawn(
      [
        "powershell",
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath '${escapedFilePath}'`,
      ],
      {
        cwd: directory,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const exitCode = await processResult.exited;
    const stdout = (await new Response(processResult.stdout).text()).trim();
    const stderr = (await new Response(processResult.stderr).text()).trim();

    if (exitCode !== 0) {
      throw new AiError(
        `bash command failed in '${directory}': ${stderr || stdout || `exit code ${exitCode}`}.`,
      );
    }

    return {
      directory,
      command,
      openedFile: toRelativePath(directory, absoluteFilePath),
      exitCode,
      stdout,
      stderr,
    };
  },
});

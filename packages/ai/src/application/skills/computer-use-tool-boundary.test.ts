// file: packages/ai/src/application/skills/computer-use-tool-boundary.test.ts

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { bashTool } from "../../../../../apps/skills/computer-use/scripts/bash.js";
import { listTool } from "../../../../../apps/skills/computer-use/scripts/list.js";
import { readTool } from "../../../../../apps/skills/computer-use/scripts/read.js";
import { AiToolExecutor } from "../tools/ai-tool-executor.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";

const executor = new AiToolExecutor();

let sandboxDirectory = "";
let trustedRootDirectory = "";
let outsideDirectory = "";
let previousTrustedRoot = "";
let previousDryRun = "";

async function executeTool(
  tool: IAiTool,
  argumentsValue: Record<string, unknown>,
) {
  return await executor.execute(
    {
      id: `${tool.name}-call`,
      name: tool.name,
      arguments: argumentsValue,
    },
    [tool],
  );
}

describe("computer-use tool boundary", () => {
  beforeEach(async () => {
    previousTrustedRoot = process.env.AI_COMPUTER_USE_TRUSTED_ROOT ?? "";
    previousDryRun = process.env.AI_COMPUTER_USE_BASH_DRY_RUN ?? "";
    sandboxDirectory = await mkdtemp(path.join(tmpdir(), "computer-use-tool-boundary-"));
    trustedRootDirectory = path.join(sandboxDirectory, "trusted-root");
    outsideDirectory = path.join(sandboxDirectory, "outside");

    await mkdir(path.join(trustedRootDirectory, "nested"), { recursive: true });
    await mkdir(path.join(trustedRootDirectory, "nothing", "random"), { recursive: true });
    await mkdir(outsideDirectory, { recursive: true });
    await writeFile(path.join(trustedRootDirectory, "inside.txt"), "inside", "utf8");
    await writeFile(
      path.join(trustedRootDirectory, "nothing", "random", "rifkileksono-avocado-9563037.ai"),
      "Adobe Illustrator fixture placeholder",
      "utf8",
    );
    await writeFile(
      path.join(trustedRootDirectory, "sofra-dramatic-and-playful-188831.mp3"),
      "audio",
      "utf8",
    );
    await writeFile(path.join(outsideDirectory, "outside.txt"), "outside", "utf8");

    process.env.AI_COMPUTER_USE_TRUSTED_ROOT = trustedRootDirectory;
    process.env.AI_COMPUTER_USE_BASH_DRY_RUN = "true";
  });

  afterEach(async () => {
    process.env.AI_COMPUTER_USE_TRUSTED_ROOT = previousTrustedRoot;
    process.env.AI_COMPUTER_USE_BASH_DRY_RUN = previousDryRun;

    if (sandboxDirectory) {
      await rm(sandboxDirectory, { recursive: true, force: true });
    }
  });

  test("read rejects traversal outside the trusted root", async () => {
    const result = await executeTool(readTool, {
      directory: trustedRootDirectory,
      filePath: "../outside/outside.txt",
    });

    expect(result.error).toContain("must not contain '..'");
  });

  test("read rejects absolute paths outside the trusted root", async () => {
    const result = await executeTool(readTool, {
      directory: trustedRootDirectory,
      filePath: path.join(outsideDirectory, "outside.txt"),
    });

    expect(result.error).toContain("must stay within");
  });

  test("list rejects directories outside the trusted root", async () => {
    const result = await executeTool(listTool, {
      directory: outsideDirectory,
    });

    expect(result.error).toContain("must stay within");
  });

  test("list can discover .ai files inside the trusted root", async () => {
    const result = await executeTool(listTool, {
      directory: trustedRootDirectory,
      extensions: [".ai"],
    });

    expect(result.error).toBeUndefined();
    expect(result.result).toEqual({
      directory: path.resolve(trustedRootDirectory),
      items: [
        {
          name: "rifkileksono-avocado-9563037.ai",
          relativePath: "nothing/random/rifkileksono-avocado-9563037.ai",
        },
      ],
    });
  });

  test("read confirms the discovered .ai file exists", async () => {
    const result = await executeTool(readTool, {
      directory: trustedRootDirectory,
      filePath: "nothing/random/rifkileksono-avocado-9563037.ai",
      readAsText: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.result).toEqual({
      directory: path.resolve(trustedRootDirectory),
      file: {
        name: "rifkileksono-avocado-9563037.ai",
        relativePath: "nothing/random/rifkileksono-avocado-9563037.ai",
        size: "Adobe Illustrator fixture placeholder".length,
        extension: ".ai",
        preview: "Adobe Illustrator fixture placeholder",
      },
    });
  });

  test("bash rejects traversal attempts", async () => {
    const result = await executeTool(bashTool, {
      directory: trustedRootDirectory,
      command: "cd ..",
    });

    expect(result.error).toContain("only allows 'Start-Process -FilePath <audio-file>'");
  });

  test("bash rejects arbitrary destructive commands", async () => {
    const result = await executeTool(bashTool, {
      directory: trustedRootDirectory,
      command: "Remove-Item -Recurse -Force .",
    });

    expect(result.error).toContain("only allows 'Start-Process -FilePath <audio-file>'");
  });

  test("bash allows opening the expected audio file inside the trusted root", async () => {
    const result = await executeTool(bashTool, {
      directory: trustedRootDirectory,
      command: "Start-Process -FilePath .\\sofra-dramatic-and-playful-188831.mp3",
    });

    expect(result.error).toBeUndefined();
    expect(result.result).toEqual({
      directory: path.resolve(trustedRootDirectory),
      command: "Start-Process -FilePath .\\sofra-dramatic-and-playful-188831.mp3",
      openedFile: "sofra-dramatic-and-playful-188831.mp3",
      skippedExecution: true,
    });
  });
});

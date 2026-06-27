// file: packages/ai/src/application/skills/ai-skill-loader.test.ts

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  loadAiSkillFromDirectory,
  parseAiSkillMarkdown,
  readAiSkillFileContent,
} from "./ai-skill-loader.js";

const temporaryDirectories: string[] = [];

async function createTemporarySkillDirectory(): Promise<string> {
  const rootDirectory = path.resolve("packages/ai/.tmp/skill-loader");
  await mkdir(rootDirectory, { recursive: true });
  const skillDirectory = await mkdtemp(path.join(rootDirectory, "skill-"));
  temporaryDirectories.push(skillDirectory);

  return skillDirectory;
}

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();

    if (!directory) {
      continue;
    }

    await rm(directory, { recursive: true, force: true });
  }
});

describe("parseAiSkillMarkdown", () => {
  test("parses frontmatter and instructions", () => {
    const result = parseAiSkillMarkdown(`---
name: computer-use
description: Uses local tools.
allowed-tools: bash read list
---

# Computer Use

Use the tools.
`);

    expect(result.frontmatter.name).toBe("computer-use");
    expect(result.frontmatter.description).toBe("Uses local tools.");
    expect(result.frontmatter.allowedTools).toEqual(["bash", "read", "list"]);
    expect(result.instructions).toContain("# Computer Use");
    expect(result.prompts).toEqual([]);
  });
});

describe("loadAiSkillFromDirectory", () => {
  test("loads the computer-use skill bundle from disk", async () => {
    const skillDirectory = path.resolve("apps/skills/computer-use");
    const skill = await loadAiSkillFromDirectory(skillDirectory, {
      repositoryRoot: path.resolve("."),
    });

    expect(skill.name).toBe("computer-use");
    expect(skill.prompts?.map((prompt) => prompt.id)).toEqual([
      "computer-use",
      "computer-use-directory-task",
    ]);
    expect(skill.prompts?.find((prompt) => prompt.id === "computer-use")?.template).toContain(
      "Use the trusted computer-use tools",
    );
    expect(skill.tools?.map((tool) => tool.name).sort()).toEqual([
      "bash",
      "list",
      "read",
    ]);
    expect(skill.files?.some((file) => file.kind === "instruction")).toBe(true);
    expect(skill.files?.some((file) => file.kind === "script")).toBe(true);
  });

  test("reads skill reference or prompt files from the loaded skill source", async () => {
    const skillDirectory = path.resolve("apps/skills/computer-use");
    const skill = await loadAiSkillFromDirectory(skillDirectory, {
      repositoryRoot: path.resolve("."),
    });
    const promptMarkdown = await readAiSkillFileContent(
      skill,
      "references/directory-task/computer-use-directory-task.prompt.md",
    );

    expect(promptMarkdown).toContain("AI_FILE={{expectedAiFile}}");
  });

  test("rejects a skill directory when SKILL.md frontmatter is missing description", async () => {
    const skillDirectory = await createTemporarySkillDirectory();
    await writeFile(
      path.join(skillDirectory, "SKILL.md"),
      `---
name: temporary-skill
---

# Temporary Skill
`,
      "utf8",
    );

    await expect(loadAiSkillFromDirectory(skillDirectory)).rejects.toThrow(
      "SKILL.md frontmatter requires 'description'.",
    );
  });

  test("only exposes allowed exported tools and ignores raw script files", async () => {
    const skillDirectory = await createTemporarySkillDirectory();
    const scriptsDirectory = path.join(skillDirectory, "scripts");
    await mkdir(scriptsDirectory, { recursive: true });
    await writeFile(
      path.join(skillDirectory, "SKILL.md"),
      `---
name: trusted-tool-skill
description: Only exposes explicitly allowed trusted tools.
allowed-tools: allowed-tool
---

# Trusted Tool Skill
`,
      "utf8",
    );
    await writeFile(
      path.join(scriptsDirectory, "index.ts"),
      `import { defineAiTool } from "../../../../src/domain/tools/define-ai-tool.js";

export const allowedTool = defineAiTool({
  name: "allowed-tool",
  description: "Allowed tool.",
});

export const blockedTool = defineAiTool({
  name: "blocked-tool",
  description: "Blocked tool.",
});
`,
      "utf8",
    );
    await writeFile(
      path.join(scriptsDirectory, "open.ps1"),
      "Write-Output 'should not be exposed as a tool'",
      "utf8",
    );

    const skill = await loadAiSkillFromDirectory(skillDirectory, {
      repositoryRoot: path.resolve("."),
    });

    expect(skill.tools?.map((tool) => tool.name)).toEqual(["allowed-tool"]);
  });
});

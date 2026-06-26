// file: packages\ai\src\prompts\ai-prompt-loader.test.ts

import path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  loadAiPromptFromMarkdownFile,
  parseAiPromptMarkdown,
} from "./ai-prompt-loader.js";

describe("parseAiPromptMarkdown", () => {
  test("parses frontmatter, metadata, variables, and body template", () => {
    const result = parseAiPromptMarkdown(`---
id: directory-task
name: Directory Task
description: Uses a directory task prompt.
version: v1
metadata:
  source: prompt-markdown
  enabled: true
variables:
  - name: directory
    description: Target directory
    required: true
  - name: extension
    defaultValue: .pdf
---

Find files in {{directory}} with extension {{extension}}.
`);

    expect(result.frontmatter.id).toBe("directory-task");
    expect(result.frontmatter.metadata).toEqual({
      source: "prompt-markdown",
      enabled: true,
    });
    expect(result.frontmatter.variables).toEqual([
      {
        name: "directory",
        description: "Target directory",
        required: true,
      },
      {
        name: "extension",
        defaultValue: ".pdf",
      },
    ]);
    expect(result.template).toBe("Find files in {{directory}} with extension {{extension}}.");
  });
});

describe("loadAiPromptFromMarkdownFile", () => {
  test("loads prompt markdown from disk", async () => {
    const prompt = await loadAiPromptFromMarkdownFile(
      path.resolve("apps/skills/computer-use/references/directory-task/computer-use-directory-task.prompt.md"),
    );

    expect(prompt.id).toBe("computer-use-directory-task");
    expect(prompt.variables?.map((variable) => variable.name)).toEqual([
      "targetDirectory",
      "expectedImages",
      "expectedAiFile",
      "expectedAudio",
    ]);
    expect(prompt.template).toContain("Use the computer-use skill");
  });
});

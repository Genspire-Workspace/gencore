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
name: Directory Task
description: Uses a directory task prompt.
argument-hint: "<directory> [extension]"
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

    expect(result.frontmatter.id).toBeUndefined();
    expect(result.frontmatter.argumentHint).toBe("<directory> [extension]");
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

  test("uses the first non-empty template line as description when omitted", () => {
    const result = parseAiPromptMarkdown(`---
variables:
  - name: directory
    required: true
---

Summarize the contents of {{directory}}.

Return concise notes.
`);

    expect(result.frontmatter.description).toBe("Summarize the contents of {{directory}}.");
  });
});

describe("loadAiPromptFromMarkdownFile", () => {
  test("loads prompt markdown from disk", async () => {
    const prompt = await loadAiPromptFromMarkdownFile(
      path.resolve("apps/skills/computer-use/references/directory-task/computer-use-directory-task.prompt.md"),
    );

    expect(prompt.id).toBe("computer-use-directory-task");
    expect(prompt.name).toBe("computer-use-directory-task");
    expect(prompt.variables?.map((variable) => variable.name)).toEqual([
      "targetDirectory",
      "expectedImages",
      "expectedAiFile",
      "expectedAudio",
    ]);
    expect(prompt.template).toContain("Use the computer-use skill");
  });
});

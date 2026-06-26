// file: packages\ai\src\prompts\ai-prompt-loader.ts

import path from "node:path";
import { AiError } from "../errors/ai-error.js";
import type { IAiPrompt, IAiPromptVariable } from "./ai-prompt.js";
import type { IAiPromptFrontmatter } from "./ai-prompt-frontmatter.js";
import { defineAiPrompt } from "./define-ai-prompt.js";

export interface IAiPromptMarkdownParseResult {
  frontmatter: IAiPromptFrontmatter;
  template: string;
}

function parseScalarValue(value: string): unknown {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  if (trimmedValue === "null") {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  if (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  ) {
    return JSON.parse(trimmedValue) as unknown;
  }

  if (
    (trimmedValue.startsWith("\"") && trimmedValue.endsWith("\"")) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function countIndentation(value: string): number {
  const match = value.match(/^ */);
  return match?.[0].length ?? 0;
}

function parseFrontmatterEntries(rawFrontmatter: string): Record<string, unknown> {
  const lines = rawFrontmatter.split("\n");
  const result: Record<string, unknown> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      continue;
    }

    const baseIndent = countIndentation(line);

    if (baseIndent !== 0) {
      throw new AiError(`Invalid frontmatter indentation: '${line.trim()}'.`);
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex <= 0) {
      throw new AiError(`Invalid prompt frontmatter line '${line.trim()}'.`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const remainder = line.slice(separatorIndex + 1).trim();

    if (remainder) {
      result[key] = parseScalarValue(remainder);
      continue;
    }

    const childLines: string[] = [];

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? "";

      if (!nextLine.trim()) {
        childLines.push("");
        index += 1;
        continue;
      }

      const nextIndent = countIndentation(nextLine);

      if (nextIndent <= baseIndent) {
        break;
      }

      childLines.push(nextLine);
      index += 1;
    }

    const meaningfulChildLines = childLines.filter((childLine) => childLine.trim());

    if (meaningfulChildLines.length === 0) {
      result[key] = "";
      continue;
    }

    const firstChild = meaningfulChildLines[0] ?? "";
    const firstTrimmed = firstChild.trimStart();
    const childIndent = countIndentation(firstChild);

    if (firstTrimmed.startsWith("- ")) {
      const items: Record<string, unknown>[] = [];
      let currentItem: Record<string, unknown> | undefined;

      for (const childLine of childLines) {
        if (!childLine.trim()) {
          continue;
        }

        const trimmedChildLine = childLine.trimStart();
        const indent = countIndentation(childLine);

        if (trimmedChildLine.startsWith("- ")) {
          currentItem = {};
          items.push(currentItem);
          const itemContent = trimmedChildLine.slice(2).trim();

          if (itemContent) {
            const itemSeparatorIndex = itemContent.indexOf(":");

            if (itemSeparatorIndex <= 0) {
              throw new AiError(`Invalid list item '${itemContent}'.`);
            }

            const itemKey = itemContent.slice(0, itemSeparatorIndex).trim();
            const itemValue = itemContent.slice(itemSeparatorIndex + 1).trim();
            currentItem[itemKey] = parseScalarValue(itemValue);
          }

          continue;
        }

        if (!currentItem || indent <= childIndent) {
          throw new AiError(`Invalid list continuation '${trimmedChildLine}'.`);
        }

        const itemSeparatorIndex = trimmedChildLine.indexOf(":");

        if (itemSeparatorIndex <= 0) {
          throw new AiError(`Invalid list field '${trimmedChildLine}'.`);
        }

        const itemKey = trimmedChildLine.slice(0, itemSeparatorIndex).trim();
        const itemValue = trimmedChildLine.slice(itemSeparatorIndex + 1).trim();
        currentItem[itemKey] = parseScalarValue(itemValue);
      }

      result[key] = items;
      continue;
    }

    const objectValue: Record<string, unknown> = {};

    for (const childLine of childLines) {
      if (!childLine.trim()) {
        continue;
      }

      const trimmedChildLine = childLine.trimStart();
      const indent = countIndentation(childLine);

      if (indent < childIndent) {
        throw new AiError(`Invalid object indentation '${trimmedChildLine}'.`);
      }

      const childSeparatorIndex = trimmedChildLine.indexOf(":");

      if (childSeparatorIndex <= 0) {
        throw new AiError(`Invalid object field '${trimmedChildLine}'.`);
      }

      const childKey = trimmedChildLine.slice(0, childSeparatorIndex).trim();
      const childValue = trimmedChildLine.slice(childSeparatorIndex + 1).trim();
      objectValue[childKey] = parseScalarValue(childValue);
    }

    result[key] = objectValue;
  }

  return result;
}

export function parseAiPromptMarkdown(content: string): IAiPromptMarkdownParseResult {
  const normalizedContent = content.replaceAll("\r\n", "\n");
  const frontmatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new AiError("PROMPT.md must start with frontmatter delimited by '---'.");
  }

  const rawFrontmatter = frontmatterMatch[1] ?? "";
  const rawTemplate = (frontmatterMatch[2] ?? "").trim();
  const parsedFrontmatter = parseFrontmatterEntries(rawFrontmatter);
  const id = parsedFrontmatter.id;

  if (typeof id !== "string") {
    throw new AiError("PROMPT.md frontmatter requires 'id'.");
  }

  const variables = Array.isArray(parsedFrontmatter.variables)
    ? parsedFrontmatter.variables as IAiPromptVariable[]
    : undefined;
  const metadata = parsedFrontmatter.metadata && typeof parsedFrontmatter.metadata === "object"
    ? parsedFrontmatter.metadata as Record<string, unknown>
    : undefined;

  return {
    frontmatter: {
      id,
      name: typeof parsedFrontmatter.name === "string" ? parsedFrontmatter.name : undefined,
      description: typeof parsedFrontmatter.description === "string"
        ? parsedFrontmatter.description
        : undefined,
      version: typeof parsedFrontmatter.version === "string"
        ? parsedFrontmatter.version
        : undefined,
      variables,
      metadata,
    },
    template: rawTemplate,
  };
}

export async function loadAiPromptFromMarkdownFile(filePath: string): Promise<IAiPrompt> {
  const absolutePath = path.resolve(filePath);
  const file = Bun.file(absolutePath);

  if (!(await file.exists())) {
    throw new AiError(`Prompt file '${absolutePath}' was not found.`);
  }

  const { frontmatter, template } = parseAiPromptMarkdown(await file.text());

  return defineAiPrompt({
    ...frontmatter,
    template,
  });
}

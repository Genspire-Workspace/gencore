// file: packages\ai\src\skills\ai-skill-loader.ts

import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AiError } from "../errors/ai-error.js";
import { defineAiPrompt } from "../prompts/define-ai-prompt.js";
import { loadAiPromptFromMarkdownFile } from "../prompts/ai-prompt-loader.js";
import type { IAiPrompt } from "../prompts/ai-prompt.js";
import type { IAiTool } from "../tools/ai-tool.js";
import type { AiSkillSourceKind, IAiSkill, IAiSkillFile } from "./ai-skill.js";
import type { IAiSkillFrontmatter } from "./ai-skill-frontmatter.js";
import { defineAiSkill } from "./define-ai-skill.js";

const MODULE_SCRIPT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
]);

export interface IAiSkillLoadOptions {
  includeFiles?: boolean;
  includePrompts?: boolean;
  includeTools?: boolean;
  repositoryRoot?: string;
  sourceKind?: AiSkillSourceKind;
  trusted?: boolean;
  priority?: number;
}

export interface IAiSkillMarkdownParseResult {
  frontmatter: IAiSkillFrontmatter;
  instructions: string;
  prompts: IAiPrompt[];
}

function createSkillPromptTemplate(
  skillName: string,
  description: string,
  instructions: string,
  metadata?: Record<string, unknown>,
): IAiPrompt | undefined {
  const normalizedInstructions = instructions.trim();

  if (!normalizedInstructions) {
    return undefined;
  }

  const frontmatterMetadata = metadata?.frontmatter && typeof metadata.frontmatter === "object"
    ? metadata.frontmatter as Record<string, unknown>
    : undefined;
  const argumentHint = typeof frontmatterMetadata?.["argument-hint"] === "string"
    ? frontmatterMetadata["argument-hint"]
    : undefined;

  return defineAiPrompt({
    id: skillName,
    name: skillName,
    description,
    argumentHint,
    template: normalizedInstructions,
    metadata: {
      source: "skill-markdown",
      skillName,
    },
  });
}

function isToolCandidate(value: unknown): value is IAiTool {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      typeof (value as { name?: unknown }).name === "string",
  );
}

function parseFrontmatterValue(value: string): string | boolean {
  const trimmedValue = value.trim();

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  return trimmedValue;
}

function classifySkillFile(skillDirectory: string, absolutePath: string): IAiSkillFile {
  const relativePath = path.relative(skillDirectory, absolutePath).replaceAll("\\", "/");
  const normalizedRelativePath = relativePath.toLowerCase();
  let kind: IAiSkillFile["kind"];

  if (normalizedRelativePath === "skill.md") {
    kind = "instruction";
  } else if (
    path.basename(normalizedRelativePath) === "prompt.json" ||
    path.basename(normalizedRelativePath) === "prompt.md" ||
    normalizedRelativePath.endsWith(".prompt.md")
  ) {
    kind = "prompt";
  } else if (normalizedRelativePath.startsWith("references/")) {
    kind = "reference";
  } else if (normalizedRelativePath.startsWith("scripts/")) {
    kind = "script";
  } else if (normalizedRelativePath.startsWith("assets/")) {
    kind = "asset";
  } else {
    kind = "other";
  }

  return {
    path: absolutePath,
    kind,
    metadata: {
      relativePath,
      extension: path.extname(absolutePath).toLowerCase(),
    },
  };
}

async function listFilesRecursive(rootDirectory: string): Promise<string[]> {
  const results: string[] = [];

  async function visit(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }

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

function ensurePathWithinRoot(targetPath: string, rootPath: string, label: string): string {
  const absoluteTargetPath = path.resolve(targetPath);
  const absoluteRootPath = path.resolve(rootPath);
  const relativePath = path.relative(absoluteRootPath, absoluteTargetPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new AiError(`${label} '${absoluteTargetPath}' must stay within '${absoluteRootPath}'.`);
  }

  return absoluteTargetPath;
}

function extractToolsFromModule(moduleExports: Record<string, unknown>): readonly IAiTool[] {
  const candidates: IAiTool[] = [];
  const toolsExport = moduleExports.tools;

  if (isToolCandidate(moduleExports.default)) {
    candidates.push(moduleExports.default);
  }

  if (isToolCandidate(moduleExports.tool)) {
    candidates.push(moduleExports.tool);
  }

  if (Array.isArray(toolsExport)) {
    for (const value of toolsExport) {
      if (isToolCandidate(value)) {
        candidates.push(value);
      }
    }
  }

  for (const value of Object.values(moduleExports)) {
    if (isToolCandidate(value)) {
      candidates.push(value);
    }
  }

  const uniqueTools = new Map<string, IAiTool>();

  for (const tool of candidates) {
    uniqueTools.set(tool.name, tool);
  }

  return [...uniqueTools.values()];
}

async function loadScriptTools(
  skillFiles: readonly IAiSkillFile[],
  allowedToolNames?: readonly string[],
): Promise<readonly IAiTool[]> {
  const scriptFiles = skillFiles.filter((file) => file.kind === "script");
  const tools = new Map<string, IAiTool>();
  const allowedToolNameSet = allowedToolNames ? new Set(allowedToolNames) : undefined;

  for (const file of scriptFiles) {
    const extension = path.extname(file.path).toLowerCase();

    if (path.basename(file.path).toLowerCase() === "index.ts" || path.basename(file.path).toLowerCase() === "index.js" || path.basename(file.path).toLowerCase() === "index.mjs") {
      if (!MODULE_SCRIPT_EXTENSIONS.has(extension)) {
        continue;
      }

      const moduleExports = await import(pathToFileURL(file.path).href);

      for (const tool of extractToolsFromModule(moduleExports as Record<string, unknown>)) {
        if (allowedToolNameSet && !allowedToolNameSet.has(tool.name)) {
          continue;
        }

        tools.set(tool.name, tool);
      }

      continue;
    }

    if (MODULE_SCRIPT_EXTENSIONS.has(extension)) {
      const moduleExports = await import(pathToFileURL(file.path).href);
      const exportedTools = extractToolsFromModule(moduleExports as Record<string, unknown>);

      if (exportedTools.length > 0) {
        for (const tool of exportedTools) {
          if (allowedToolNameSet && !allowedToolNameSet.has(tool.name)) {
            continue;
          }

          tools.set(tool.name, tool);
        }

        continue;
      }
    }
  }

  return [...tools.values()];
}

export function parseAiSkillMarkdown(content: string): IAiSkillMarkdownParseResult {
  const normalizedContent = content.replaceAll("\r\n", "\n");
  const frontmatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new AiError("SKILL.md must start with frontmatter delimited by '---'.");
  }

  const rawFrontmatter = frontmatterMatch[1] ?? "";
  const rawInstructions = frontmatterMatch[2] ?? "";
  const frontmatterEntries = rawFrontmatter
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const values = new Map<string, string | boolean>();

  for (const entry of frontmatterEntries) {
    const separatorIndex = entry.indexOf(":");

    if (separatorIndex <= 0) {
      throw new AiError(`Invalid SKILL.md frontmatter line '${entry}'.`);
    }

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1);
    values.set(key, parseFrontmatterValue(value));
  }

  const name = values.get("name");
  const description = values.get("description");

  if (typeof name !== "string") {
    throw new AiError("SKILL.md frontmatter requires 'name'.");
  }

  if (typeof description !== "string") {
    throw new AiError("SKILL.md frontmatter requires 'description'.");
  }

  const allowedToolsValue = values.get("allowed-tools");
  const disableModelInvocation = values.get("disable-model-invocation");
  const promptMatches = [...rawInstructions.matchAll(/```ai-prompt\s*\n([\s\S]*?)\n```/g)];
  const prompts = promptMatches.map((match) =>
    defineAiPrompt(JSON.parse(match[1] ?? "{}") as IAiPrompt)
  );

  return {
    frontmatter: {
      name,
      description,
      license: typeof values.get("license") === "string"
        ? values.get("license") as string
        : undefined,
      compatibility: typeof values.get("compatibility") === "string"
        ? values.get("compatibility") as string
        : undefined,
      metadata: {
        frontmatter: Object.fromEntries(values.entries()),
      },
      allowedTools: typeof allowedToolsValue === "string"
        ? allowedToolsValue.split(/\s+/).filter(Boolean)
        : undefined,
      disableModelInvocation: typeof disableModelInvocation === "boolean"
        ? disableModelInvocation
        : undefined,
    },
    instructions: rawInstructions.trim(),
    prompts,
  };
}

export async function loadAiSkillFromDirectory(
  skillDirectory: string,
  options?: IAiSkillLoadOptions,
): Promise<IAiSkill> {
  const absoluteSkillDirectory = path.resolve(skillDirectory);
  const repositoryRoot = options?.repositoryRoot
    ? path.resolve(options.repositoryRoot)
    : path.resolve(absoluteSkillDirectory, "..", "..", "..");
  const skillMarkdownPath = path.join(absoluteSkillDirectory, "SKILL.md");
  const skillMarkdownFile = Bun.file(skillMarkdownPath);

  if (!(await skillMarkdownFile.exists())) {
    throw new AiError(`Skill directory '${absoluteSkillDirectory}' is missing SKILL.md.`);
  }

  const { frontmatter, instructions, prompts: markdownPrompts } = parseAiSkillMarkdown(
    await skillMarkdownFile.text(),
  );
  const skillFiles = options?.includeFiles === false
    ? []
    : (await listFilesRecursive(absoluteSkillDirectory)).map((filePath) =>
        classifySkillFile(absoluteSkillDirectory, filePath)
      );
  const promptFiles = skillFiles.filter((file) => file.kind === "prompt");
  const skillPrompt = createSkillPromptTemplate(
    frontmatter.name,
    frontmatter.description,
    instructions,
    frontmatter.metadata,
  );
  const filePrompts = options?.includePrompts === false
    ? []
    : await Promise.all(
        promptFiles.map(async (file) =>
          path.basename(file.path).toLowerCase() === "prompt.md" ||
            path.basename(file.path).toLowerCase().endsWith(".prompt.md")
            ? loadAiPromptFromMarkdownFile(file.path)
            : defineAiPrompt(JSON.parse(await Bun.file(file.path).text()) as IAiPrompt)
        ),
      );
  const prompts = options?.includePrompts === false
    ? []
    : [
        ...(skillPrompt ? [skillPrompt] : []),
        ...markdownPrompts,
        ...filePrompts,
      ];
  const tools = options?.includeTools === false
    ? []
    : await loadScriptTools(skillFiles, frontmatter.allowedTools);
  const metadata = frontmatter.metadata
    ? {
        ...frontmatter.metadata,
        loader: {
          repositoryRoot,
          skillDirectory: absoluteSkillDirectory,
        },
      }
    : {
        loader: {
          repositoryRoot,
          skillDirectory: absoluteSkillDirectory,
        },
      };

  return defineAiSkill({
    ...frontmatter,
    metadata,
    instructions,
    prompts,
    tools,
    files: skillFiles,
    source: {
      kind: options?.sourceKind ?? "project",
      path: absoluteSkillDirectory,
      trusted: options?.trusted ?? true,
      priority: options?.priority,
    },
  });
}

export async function readAiSkillFileContent(
  skill: IAiSkill,
  relativePath: string,
): Promise<string> {
  const sourcePath = skill.source?.path;

  if (!sourcePath) {
    throw new AiError(`AI skill '${skill.name}' does not have a source path.`);
  }

  const resolvedPath = ensurePathWithinRoot(
    path.resolve(sourcePath, relativePath),
    sourcePath,
    "Skill file",
  );

  return await Bun.file(resolvedPath).text();
}

// file: packages\ai\src\tools\ai-tool-utils.ts

import type { IAiTool } from "./ai-tool.js";
import type { IAiToolCall } from "./ai-tool-call.js";
import type { IAiToolResult } from "./ai-tool-result.js";

export function findAiTool(
  tools: readonly IAiTool[] | undefined,
  name: string,
): IAiTool | undefined {
  return tools?.find((tool) => tool.name === name);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function readStringField(
  value: unknown,
  keys: readonly string[],
): string | undefined {
  if (!isRecord(value)) return undefined;

  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string") return field;
  }

  return undefined;
}

export function readUnknownField(
  value: unknown,
  keys: readonly string[],
): unknown {
  if (!isRecord(value)) return undefined;

  for (const key of keys) {
    if (key in value) return value[key];
  }

  return undefined;
}

export function createToolCallFromUnknown(
  value: unknown,
): IAiToolCall | undefined {
  const id = readStringField(value, [
    "toolCallId",
    "id",
  ]) ?? crypto.randomUUID();
  const name = readStringField(value, ["toolName", "name"]);

  if (!name) return undefined;

  const args =
    readUnknownField(value, ["input", "args", "arguments"]) ?? {};

  return {
    id,
    name,
    arguments: args,
    raw: value,
  };
}

export function createToolResultFromUnknown(
  value: unknown,
): IAiToolResult | undefined {
  const toolCallId = readStringField(value, ["toolCallId", "id"]) ?? "";
  const name = readStringField(value, ["toolName", "name"]) ?? "";

  if (!toolCallId && !name) return undefined;

  const result = readUnknownField(value, ["output", "result"]);

  return {
    toolCallId,
    name,
    result,
    raw: value,
  };
}

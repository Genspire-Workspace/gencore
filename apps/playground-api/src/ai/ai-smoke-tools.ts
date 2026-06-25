import type { IAiTool } from "../../../../packages/ai/src/tools/ai-tool.js";
import { defineAiTool } from "../../../../packages/ai/src/tools/define-ai-tool.js";
import { AiToolRegistry } from "../../../../packages/ai/src/tools/ai-tool-registry.js";

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

export const playgroundGetCapitalTool = defineAiTool({
  name: "get_capital",
  description: "Gets the capital city for a country.",
  parameters: {
    type: "object",
    properties: {
      country: {
        type: "string",
        description: "Country name",
      },
    },
    required: ["country"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const country =
      typeof input.country === "string" ? input.country : "Portugal";

    return {
      country,
      capital: "Lisbon",
    };
  },
});

export const playgroundAddNumbersTool = defineAiTool({
  name: "add_numbers",
  description: "Adds two numbers.",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
    },
    required: ["a", "b"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const a = typeof input.a === "number" ? input.a : 0;
    const b = typeof input.b === "number" ? input.b : 0;

    return {
      a,
      b,
      sum: a + b,
    };
  },
});

export const playgroundAiSmokeToolRegistry = new AiToolRegistry([
  playgroundGetCapitalTool,
  playgroundAddNumbersTool,
]);

export function resolvePlaygroundServerTool(name: string): IAiTool | undefined {
  return playgroundAiSmokeToolRegistry.tryGet(name);
}

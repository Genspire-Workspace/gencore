import type { IAiTool } from "@genspire/ai/domain";
import { defineAiTool } from "@genspire/ai/domain";
import { AiToolRegistry } from "@genspire/ai/application";

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function clampDelayMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10_000, Math.floor(value)));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

export const playgroundWaitThenGetCapitalTool = defineAiTool({
  name: "wait_then_get_capital",
  description: "Waits for the requested duration, then returns the capital city for a country.",
  parameters: {
    type: "object",
    properties: {
      country: {
        type: "string",
        description: "Country name",
      },
      delayMs: {
        type: "number",
        description: "Delay before returning the result, in milliseconds.",
      },
    },
    required: ["country"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const country =
      typeof input.country === "string" ? input.country : "Portugal";
    const delayMs = clampDelayMs(input.delayMs);

    await sleep(delayMs);

    return {
      country,
      capital: "Lisbon",
      delayMs,
    };
  },
});

export const playgroundAiSmokeToolRegistry = new AiToolRegistry([
  playgroundGetCapitalTool,
  playgroundAddNumbersTool,
  playgroundWaitThenGetCapitalTool,
]);

export function resolvePlaygroundServerTool(name: string): IAiTool | undefined {
  return playgroundAiSmokeToolRegistry.tryGet(name);
}

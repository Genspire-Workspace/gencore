// file: apps\playground-ai\tools\test-tools.ts

import { defineAiTool } from "../../../packages/ai/src/domain/tools/define-ai-tool.js";

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

export const getCapitalTool = defineAiTool({
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
    const requestedCountry =
      typeof input.country === "string" ? input.country : "Portugal";
    const normalizedCountry = requestedCountry.trim().toLowerCase();
    const capitalByCountry: Record<string, string> = {
      portugal: "Lisbon",
      japan: "Tokyo",
      brazil: "Brasilia",
      germany: "Berlin",
      canada: "Ottawa",
    };
    const country = requestedCountry.trim() || "Portugal";
    const capital = capitalByCountry[normalizedCountry] ?? "Lisbon";

    return {
      country,
      capital,
    };
  },
});

export const addNumbersTool = defineAiTool({
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

export const waitThenAddNumbersTool = defineAiTool({
  name: "wait_then_add_numbers",
  description: "Waits for the requested duration, then adds two numbers.",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
      delayMs: {
        type: "number",
        description: "Delay before returning the result, in milliseconds.",
      },
    },
    required: ["a", "b"],
  },
  execute: async (args: unknown) => {
    const input = toRecord(args);
    const a = typeof input.a === "number" ? input.a : 0;
    const b = typeof input.b === "number" ? input.b : 0;
    const delayMs = clampDelayMs(input.delayMs);

    await sleep(delayMs);

    return {
      a,
      b,
      sum: a + b,
      delayMs,
    };
  },
});

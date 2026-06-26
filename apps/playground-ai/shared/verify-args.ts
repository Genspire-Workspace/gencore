// file: apps\playground-ai\shared\verify-args.ts

import type {
  IAiVerifyCliArgs,
  IAiVerifyScenarioFilter,
} from "./verify-types.js";

export function parseAiVerifyArgs(
  argv = process.argv.slice(2),
): IAiVerifyCliArgs {
  const result: IAiVerifyCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--") {
      continue;
    }

    switch (current) {
      case "--list":
      case "-l":
        result.list = true;
        break;

      case "--scenarios":
      case "--scenario":
      case "--s":
      case "-s":
        result.scenarios = argv[index + 1];
        index += 1;
        break;

      case "--base-url":
      case "-b":
        result.baseUrl = argv[index + 1];
        index += 1;
        break;

      case "--model":
      case "--ollama-model":
      case "-m":
        result.model = argv[index + 1];
        index += 1;
        break;
    }
  }

  return result;
}

export function createScenarioFilter(
  cliScenarios?: string,
  envScenarios = process.env.AI_VERIFY_SCENARIOS,
): IAiVerifyScenarioFilter {
  const value = cliScenarios ?? envScenarios;

  if (!value) {
    return {
      explicit: false,
      values: null,
    };
  }

  return {
    explicit: true,
    values: new Set(
      value
        .split(",")
        .map((scenario) => scenario.trim().toLowerCase())
        .filter(Boolean),
    ),
  };
}

export function shouldRunScenario(
  filter: IAiVerifyScenarioFilter,
  scenarioId: string,
): boolean {
  return !filter.values || filter.values.has(scenarioId.toLowerCase());
}

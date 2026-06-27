// file: apps/playground-app-ai/src/verify/shared/args.ts

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export interface IVerifyCliArgs {
  list?: boolean;
  models?: string[];
  embedModel?: string;
  visionModel?: string;
  baseUrl?: string;
  apiKey?: string;
  reasoningEffort?: ReasoningEffort;
  image?: string;
  skipVision?: boolean;
  skipEmbedding?: boolean;
}

export function splitCsv(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

export function parseVerifyArgs(
  argv: readonly string[] = process.argv.slice(2),
): IVerifyCliArgs {
  const result: IVerifyCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current || current === "--") {
      continue;
    }

    switch (current) {
      case "--list":
      case "-l":
        result.list = true;
        break;

      case "--models":
      case "--model":
      case "-m":
        result.models = splitCsv(argv[index + 1]);
        index += 1;
        break;

      case "--embed-model":
        result.embedModel = argv[index + 1];
        index += 1;
        break;

      case "--vision-model":
        result.visionModel = argv[index + 1];
        index += 1;
        break;

      case "--base-url":
      case "-b":
        result.baseUrl = argv[index + 1];
        index += 1;
        break;

      case "--api-key":
      case "-k":
        result.apiKey = argv[index + 1];
        index += 1;
        break;

      case "--image":
        result.image = argv[index + 1];
        index += 1;
        break;

      case "--reasoning-effort": {
        const value = argv[index + 1] as ReasoningEffort | undefined;
        if (
          value === "none" ||
          value === "low" ||
          value === "medium" ||
          value === "high"
        ) {
          result.reasoningEffort = value;
        }
        index += 1;
        break;
      }

      case "--skip-vision":
        result.skipVision = true;
        break;

      case "--skip-embedding":
        result.skipEmbedding = true;
        break;
    }
  }

  return result;
}
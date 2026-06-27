// file: apps/playground-app-ai/src/verify/verification-ollama.ts

import { OllamaClient } from "../../../../packages/ai/src/providers/ollama/index.js";
import {
  OLLAMA_DEFAULT_IMAGE_PATH,
  OLLAMA_VISION_EXPECTED,
  OLLAMA_VISION_PROMPT,
} from "../ai/providers.js";
import {
  createLocalImagePart,
  parseVerifyArgs,
  runProviderVerification,
  splitCsv,
} from "./shared/index.js";

const PROVIDER = "ollama";
const args = parseVerifyArgs();

if (args.list) {
  console.log("Ollama verification");
  console.log("  bun run verify:ollama -- --models gemma4:12b --embed-model embeddinggemma:latest");
  console.log("  vision (image+text parts) runs per chat model when it accepts image input");
  console.log("  vision uses data/test-directory/images/arabervollblut-horse-10333771.jpg by default; override with --image <path>");
  console.log("  override unknown-model modalities via OLLAMA_DEFAULT_INPUT_MODALITIES (e.g. text,image)");
  console.log("Env: OLLAMA_API_KEY, OLLAMA_HOST, OLLAMA_CHAT_MODELS, OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL, OLLAMA_DEFAULT_INPUT_MODALITIES, OLLAMA_DEFAULT_REASONING");
  process.exit(0);
}

const apiKey = (args.apiKey ?? process.env.OLLAMA_API_KEY)?.trim();
const host = (args.baseUrl ?? process.env.OLLAMA_HOST)?.trim() || "http://127.0.0.1:11434";
const chatModels =
  args.models ??
  splitCsv(process.env.OLLAMA_CHAT_MODELS) ??
  [process.env.OLLAMA_CHAT_MODEL?.trim() || "gemma4:12b"];
const embedModel =
  args.embedModel ?? process.env.OLLAMA_EMBED_MODEL?.trim() ?? "embeddinggemma:latest";

if (chatModels.length === 0) {
  console.error("No chat models configured for Ollama. Use --models or OLLAMA_CHAT_MODELS.");
  process.exit(1);
}

const imagePath = args.image ?? OLLAMA_DEFAULT_IMAGE_PATH;
const image = await createLocalImagePart(imagePath).catch((error) => {
  if (args.image) {
    throw error;
  }

  console.warn(
    `Default image not found at ${imagePath}: ${error instanceof Error ? error.message : String(error)}. Falling back to a generated image.`,
  );
  return undefined;
});

const client = new OllamaClient({
  id: PROVIDER,
  name: "Ollama",
  host,
  headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  defaultModel: chatModels[0],
});

await runProviderVerification({
  provider: PROVIDER,
  providerName: "Ollama",
  client,
  chatModels,
  embedModel,
  supportsEmbedding: !args.skipEmbedding && Boolean(embedModel),
  // gemma4:12b is a local Ollama name not present in the catalogue; default it
  // to a multimodal reasoning model so image+text parts and reasoning are exercised.
  defaultModelCapabilities: {
    inputModalities: ["text", "image"],
    reasoning: true,
    toolCall: true,
  },
  skipVision: args.skipVision,
  reasoningEffort: args.reasoningEffort,
  image,
  visionPrompt: OLLAMA_VISION_PROMPT,
  visionExpected: OLLAMA_VISION_EXPECTED,
});
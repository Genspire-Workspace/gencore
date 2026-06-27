// file: apps/playground-app-ai/src/verify/verification-openai-like.ts

import { OpenAICompatibleClient } from "../../../../packages/ai/src/providers/openai-compatible/index.js";
import {
  createLocalImagePart,
  parseVerifyArgs,
  runProviderVerification,
  splitCsv,
} from "./shared/index.js";

const PROVIDER = "deepseek";
const args = parseVerifyArgs();

if (args.list) {
  console.log("OpenAI-compatible (DeepSeek) verification");
  console.log("  bun run verify:openai-like -- --models deepseek-v4-flash,deepseek-v4-pro");
  console.log("  vision (image+text parts) runs per chat model only when it accepts image input");
  console.log("Env: DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_CHAT_MODELS, DEEPSEEK_CHAT_MODEL, DEEPSEEK_EMBED_MODEL");
  process.exit(0);
}

const apiKey = (args.apiKey ?? process.env.DEEPSEEK_API_KEY)?.trim();

if (!apiKey) {
  console.error("DEEPSEEK_API_KEY is not set. Set it in .env or pass --api-key.");
  process.exit(1);
}

const baseURL =
  args.baseUrl ?? process.env.DEEPSEEK_BASE_URL?.trim() ?? "https://api.deepseek.com/v1";
const chatModels =
  args.models ??
  splitCsv(process.env.DEEPSEEK_CHAT_MODELS) ??
  [process.env.DEEPSEEK_CHAT_MODEL?.trim() || "deepseek-v4-flash"];
const embedModel = args.embedModel ?? process.env.DEEPSEEK_EMBED_MODEL?.trim();

if (chatModels.length === 0) {
  console.error("No chat models configured for DeepSeek. Use --models or DEEPSEEK_CHAT_MODELS.");
  process.exit(1);
}

const image = args.image ? await createLocalImagePart(args.image) : undefined;

const client = new OpenAICompatibleClient({
  id: PROVIDER,
  name: "DeepSeek",
  baseURL,
  apiKey,
});

await runProviderVerification({
  provider: PROVIDER,
  providerName: "DeepSeek",
  client,
  chatModels,
  embedModel,
  supportsEmbedding: !args.skipEmbedding && Boolean(embedModel),
  // DeepSeek chat models are text + reasoning by default; image+text parts are
  // only exercised when a catalogue model (or override) declares image input.
  defaultModelCapabilities: {
    inputModalities: ["text"],
    reasoning: true,
    toolCall: true,
  },
  skipVision: args.skipVision,
  reasoningEffort: args.reasoningEffort,
  image,
});
// file: packages\ai\test\verify-generation.ts

import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  openAiCompatibleProvider,
  anthropicCompatibleProvider,
  ollamaProvider,
  type IAiRuntimeProvider,
  type IChatGenerator,
} from "@genspire/ai";

interface Scenario {
  label: string;
  chatModel: string;
  embeddingModel?: string;
  baseUrl: string;
  apiKey?: string;
  chat: boolean;
  embeddings: boolean;
  provider: IAiRuntimeProvider;
}

const GRAY = "\u001b[90m";
const RESET = "\u001b[0m";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${d.getMilliseconds()}`;
}

const LOG_DIR = path.resolve(import.meta.dirname, "../../../data/logs/test");
mkdirSync(LOG_DIR, { recursive: true });

const LOG_PATH = path.join(LOG_DIR, `verify-generation-${timestamp()}.log`);
const logFile = Bun.file(LOG_PATH);
const writer = logFile.writer();

const origLog = console.log;
const origWrite = process.stdout.write.bind(process.stdout);

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

console.log = (...args: unknown[]) => {
  const line = args.map(String).join(" ") + "\n";
  origLog(...args);
  writer.write(stripAnsi(line));
};

process.stdout.write = ((s: string) => {
  origWrite(s);
  writer.write(stripAnsi(s));
  return true;
}) as typeof process.stdout.write;

console.log(`Log: ${LOG_PATH}\n`);

const scenarios: Scenario[] = [
  {
    label: "Ollama (chat + embeddings)",
    chatModel: process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma:latest",
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.OLLAMA_API_KEY,
    chat: true,
    embeddings: true,
    provider: ollamaProvider({
      id: "ollama",
      displayName: "Ollama",
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.OLLAMA_API_KEY,
      defaultChatModel: process.env.OLLAMA_CHAT_MODEL ?? "gemma4:12b",
      defaultEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma:latest",
    }),
  },
  {
    label: "DeepSeek (OpenAI)",
    chatModel: process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-v4-flash",
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "sk-9aa09af613654c6e87c942af909bd12c",
    chat: true,
    embeddings: false,
    provider: openAiCompatibleProvider({
      id: "deepseek-openai",
      displayName: "DeepSeek OpenAI",
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "sk-9aa09af613654c6e87c942af909bd12c",
      defaultChatModel: process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-v4-flash",
    }),
  },
  {
    label: "DeepSeek (Anthropic)",
    chatModel: process.env.DEEPSEEK_ANTHROPIC_CHAT_MODEL ?? "deepseek-v4-pro",
    baseUrl: process.env.DEEPSEEK_ANTHROPIC_BASE_URL ?? "https://api.deepseek.com/anthropic",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "sk-9aa09af613654c6e87c942af909bd12c",
    chat: true,
    embeddings: false,
    provider: anthropicCompatibleProvider({
      id: "deepseek-anthropic",
      displayName: "DeepSeek Anthropic",
      baseUrl: process.env.DEEPSEEK_ANTHROPIC_BASE_URL ?? "https://api.deepseek.com/anthropic",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "sk-9aa09af613654c6e87c942af909bd12c",
      defaultChatModel: process.env.DEEPSEEK_ANTHROPIC_CHAT_MODEL ?? "deepseek-v4-pro",
    }),
  },
];

interface Mode {
  name: string;
  prompt: string;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
}

const modes: Mode[] = [
  {
    name: "No Reasoning",
    prompt: "Reply with exactly: GenCore AI works",
  },
  {
    name: "Medium Reasoning",
    prompt: "Count from 1 to 5, one number at a time. Think about each number before saying it.",
    reasoningEffort: "medium",
  },
];

async function runMode(
  chat: IChatGenerator,
  model: string,
  mode: Mode,
): Promise<unknown[]> {
  const chunks: unknown[] = [];
  let currentBlockType: string | undefined;

  console.log(`--- ${mode.name} ---`);

  for await (const chunk of chat.streamChatCompletion({
    model,
    messages: [{ role: "user", content: mode.prompt }],
    settings: mode.reasoningEffort ? { reasoningEffort: mode.reasoningEffort } : undefined,
  })) {
    chunks.push(chunk);
    const raw = chunk.raw as Record<string, unknown> | undefined;

    if (raw && raw.type === "content_block_start") {
      currentBlockType = (raw.content_block as Record<string, string>)?.type;
      continue;
    }

    if (raw?.contentBlockType) {
      currentBlockType = raw.contentBlockType as string;
    }

    if (chunk.reasoningDelta) {
      process.stdout.write(`${GRAY}${chunk.reasoningDelta}${RESET}`);
    }

    if (chunk.delta) {
      if (currentBlockType === "thinking") {
        process.stdout.write(`${GRAY}${chunk.delta}${RESET}`);
      } else {
        process.stdout.write(chunk.delta);
      }
    }

    if (chunk.finishReason) {
      console.log(`\nFinished: ${chunk.finishReason}`);
    }
  }

  return chunks;
}

for (const scenario of scenarios) {
  console.log(`\n===== ${scenario.label} =====`);
  console.log(`id: ${scenario.provider.id}`);
  console.log(`chat: ${scenario.provider.supportsChat()}`);
  console.log(`embeddings: ${scenario.provider.supportsEmbeddings()}`);

  if (scenario.chat && scenario.provider.chat) {
    for (const mode of modes) {
      const rawChunks = await runMode(scenario.provider.chat, scenario.chatModel, mode);
      console.log(`\n--- Raw: ${mode.name} ---`);
      console.log(JSON.stringify(rawChunks, null, 2));
    }
  }

  if (scenario.embeddings && scenario.provider.embeddings) {
    const embeddings = await scenario.provider.embeddings.generateEmbedding({
      model: scenario.embeddingModel,
      input: "GenCore AI embeddings smoke test",
    });

    console.log("\nEmbedding response:");
    console.log(
      JSON.stringify(
        {
          provider: embeddings.provider,
          model: embeddings.model,
          count: embeddings.embeddings.length,
          firstVectorLength: embeddings.embeddings[0]?.embedding.length,
          usage: embeddings.usage,
        },
        null,
        2,
      ),
    );
  }

  console.log();
}

await writer.end();

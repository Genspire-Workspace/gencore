import { mkdirSync } from "node:fs";
import path from "node:path";
import { AiClientRegistry, AiService, AiError } from "@genspire/ai";

const LOG_DIR = path.resolve(import.meta.dirname, "../../../data/logs/test");
mkdirSync(LOG_DIR, { recursive: true });

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${d.getMilliseconds()}`;
}

const LOG_PATH = path.join(LOG_DIR, `verify-generation-${timestamp()}.log`);
const writer = Bun.file(LOG_PATH).writer();

function log(message: string): void {
  console.log(message);
  writer.write(`${message}\n`);
}

const service = new AiService(new AiClientRegistry(), {
  chatProvider: "placeholder",
  chatModel: "placeholder-model",
  embeddingProvider: "placeholder",
  embeddingModel: "placeholder-embedding-model",
});

log(`Log: ${LOG_PATH}`);
log("");
log("Verifying current AI package state.");
log("Clients were intentionally removed. Generation should fail until new clients are implemented.");
log("");

async function verifyChatFailure(): Promise<void> {
  try {
    await service.generateChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    });
    throw new Error("Chat generation unexpectedly succeeded.");
  } catch (error) {
    if (!(error instanceof AiError)) {
      throw error;
    }

    log(`Chat generation failure: ${error.message}`);
  }
}

async function verifyEmbeddingFailure(): Promise<void> {
  try {
    await service.generateEmbedding({
      input: "hello",
    });
    throw new Error("Embedding generation unexpectedly succeeded.");
  } catch (error) {
    if (!(error instanceof AiError)) {
      throw error;
    }

    log(`Embedding generation failure: ${error.message}`);
  }
}

await verifyChatFailure();
await verifyEmbeddingFailure();
await writer.end();

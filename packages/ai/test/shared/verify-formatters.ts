import type { IChatGenerationChunk } from "../../src/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../src/chat/chat-generation-request.js";
import type { IEmbeddingGenerationRequest } from "../../src/embeddings/embedding-generation-request.js";
import type { IAiVerifyLogger } from "./verify-types.js";

export function logChatOrEmbeddingRequest(
  logger: IAiVerifyLogger,
  request: IChatGenerationRequest | IEmbeddingGenerationRequest,
): void {
  logger.log("  Request:");
  logger.log(`    model: ${request.model ?? "(default)"}`);
  logger.log(`    provider: ${request.provider ?? "(default)"}`);

  if ("messages" in request) {
    logger.log(`    messages: ${JSON.stringify(request.messages)}`);

    if (request.settings) {
      logger.log(`    settings: ${JSON.stringify(request.settings)}`);
    }

    if (request.tools?.length) {
      logger.log(`    tools: ${request.tools.map((tool) => tool.name).join(", ")}`);
    }

    if (request.metadata) {
      logger.log(`    metadata: ${JSON.stringify(request.metadata)}`);
    }

    return;
  }

  logger.log(`    input: ${JSON.stringify(request.input)}`);

  if (request.dimensions) {
    logger.log(`    dimensions: ${request.dimensions}`);
  }

  if (request.metadata) {
    logger.log(`    metadata: ${JSON.stringify(request.metadata)}`);
  }
}

export function formatChatChunk(chunk: IChatGenerationChunk): string {
  const parts: string[] = ["[chunk]"];

  if (chunk.type) parts.push(`type=${chunk.type}`);
  if (chunk.delta) parts.push(`delta=${JSON.stringify(chunk.delta)}`);
  if (chunk.reasoningDelta) {
    parts.push(`reasoning=${JSON.stringify(chunk.reasoningDelta)}`);
  }
  if (chunk.toolCall) parts.push(`toolCall=${JSON.stringify(chunk.toolCall)}`);
  if (chunk.toolResult) {
    parts.push(`toolResult=${JSON.stringify(chunk.toolResult)}`);
  }
  if (chunk.finishReason) parts.push(`finishReason=${chunk.finishReason}`);
  if (chunk.usage) {
    parts.push(
      `usage={input:${chunk.usage.inputTokens},output:${chunk.usage.outputTokens},total:${chunk.usage.totalTokens}}`,
    );
  }
  if (chunk.message) {
    parts.push(`message=${JSON.stringify(chunk.message)}`);
  }

  return parts.join(" ");
}

export function logChatChunk(
  logger: IAiVerifyLogger,
  chunk: IChatGenerationChunk,
): void {
  logger.log(formatChatChunk(chunk));
}

export function isEmptyChatChunk(chunk: IChatGenerationChunk): boolean {
  return !(
    chunk.type ||
    chunk.delta ||
    chunk.reasoningDelta ||
    chunk.toolCall ||
    chunk.toolResult ||
    chunk.finishReason ||
    chunk.usage ||
    chunk.message
  );
}

export interface IChatStreamSummary {
  fullText: string;
  fullReasoning: string;
  toolCallCount: number;
  toolResultCount: number;
  finishCount: number;
  emptyChunkCount: number;
}

export function createEmptyChatStreamSummary(): IChatStreamSummary {
  return {
    fullText: "",
    fullReasoning: "",
    toolCallCount: 0,
    toolResultCount: 0,
    finishCount: 0,
    emptyChunkCount: 0,
  };
}

export function applyChunkToSummary(
  summary: IChatStreamSummary,
  chunk: IChatGenerationChunk,
  collectReasoning = false,
): void {
  if (chunk.delta) {
    summary.fullText += chunk.delta;
  }

  if (collectReasoning && chunk.reasoningDelta) {
    summary.fullReasoning += chunk.reasoningDelta;
  }

  if (chunk.toolCall) {
    summary.toolCallCount += 1;
  }

  if (chunk.toolResult) {
    summary.toolResultCount += 1;
  }

  if (chunk.type === "finish" || chunk.finishReason) {
    summary.finishCount += 1;
  }

  if (isEmptyChatChunk(chunk)) {
    summary.emptyChunkCount += 1;
  }
}

export function logChatStreamSummary(
  logger: IAiVerifyLogger,
  summary: IChatStreamSummary,
): void {
  logger.log(`  Full text: ${JSON.stringify(summary.fullText)}`);
  if (summary.fullReasoning) {
    logger.log(`  Full reasoning: ${JSON.stringify(summary.fullReasoning)}`);
  }
  logger.log(`  Tool calls: ${summary.toolCallCount}`);
  logger.log(`  Tool results: ${summary.toolResultCount}`);
  logger.log(`  Finish chunks: ${summary.finishCount}`);
  logger.log(`  Empty chunks: ${summary.emptyChunkCount}`);
}

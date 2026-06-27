// file: apps/playground-app-ai/src/verify/shared/formatters.ts

import type { IChatGenerationChunk } from "../../../../../packages/ai/src/domain/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../../../../packages/ai/src/domain/chat/chat-generation-request.js";
import type { IEmbeddingGenerationRequest } from "../../../../../packages/ai/src/domain/embeddings/embedding-generation-request.js";
import type { AiMessageContent } from "../../../../../packages/ai/src/domain/messages/ai-content-part.js";
import type { IAppAiLogger } from "./logger.js";

export function extractText(content: AiMessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function summarizeContent(content: AiMessageContent): unknown {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part) => {
    if (part.type === "image") {
      return { type: "image", mediaType: part.mediaType, bytes: part.data.length };
    }

    if (part.type === "file") {
      return { type: "file", mediaType: part.mediaType, filename: part.filename };
    }

    return part;
  });
}

export function logRequest(
  logger: IAppAiLogger,
  request: IChatGenerationRequest | IEmbeddingGenerationRequest,
): void {
  logger.log("  Request:");
  logger.log(`    model: ${request.model ?? "(default)"}`);
  logger.log(`    provider: ${request.provider ?? "(default)"}`);

  if ("messages" in request) {
    const messages = request.messages.map((message) => ({
      role: message.role,
      name: message.name,
      content: summarizeContent(message.content),
    }));

    logger.log(`    messages: ${JSON.stringify(messages)}`);

    if (request.settings) {
      logger.log(`    settings: ${JSON.stringify(request.settings)}`);
    }

    if (request.tools?.length) {
      logger.log(`    tools: ${request.tools.map((tool) => tool.name).join(", ")}`);
    }

    return;
  }

  logger.log(`    input: ${JSON.stringify(request.input)}`);

  if (request.dimensions) {
    logger.log(`    dimensions: ${request.dimensions}`);
  }
}

export function formatChunk(chunk: IChatGenerationChunk): string {
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

export function isEmptyChunk(chunk: IChatGenerationChunk): boolean {
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

  if (isEmptyChunk(chunk)) {
    summary.emptyChunkCount += 1;
  }
}

export function logStreamSummary(
  logger: IAppAiLogger,
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
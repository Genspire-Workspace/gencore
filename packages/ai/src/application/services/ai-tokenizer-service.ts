// file: packages/ai/src/application/services/ai-tokenizer-service.ts

import {
  encodingForModel,
  getEncoding,
  type Tiktoken,
  type TiktokenModel,
} from "js-tiktoken";
import type { IChatMessage } from "../../domain/chat/chat-message.js";
import type {
  AiContentPart,
  AiMessageContent,
} from "../../domain/messages/ai-content-part.js";
import type { IAiContext } from "../context/ai-context.js";
import type { IAiTokenChunk } from "../../domain/tokenization/ai-token-chunk.js";
import type { IAiTokenChunkResult } from "../../domain/tokenization/ai-token-chunk-result.js";
import type { IAiTokenCountResult } from "../../domain/tokenization/ai-token-count-result.js";
import type {
  IAiTokenChunkOptions,
  IAiTokenizerResolveOptions,
} from "../../domain/tokenization/ai-tokenizer-options.js";

const DEFAULT_ENCODING = "cl100k_base";

export class AiTokenizerService {
  countTokens(
    input: string | IAiContext,
    options?: IAiTokenizerResolveOptions,
  ): IAiTokenCountResult {
    const resolved = this.resolveTokenizer(options);
    const text = this.resolveInputToText(input);
    const tokens = resolved.encoding.encode(text);

    return {
      encoding: resolved.encodingName,
      tokenCount: tokens.length,
    };
  }

  chunkText(text: string, options: IAiTokenChunkOptions): IAiTokenChunkResult {
    const maxTokens = Math.max(1, Math.floor(options.maxTokens));
    const overlapTokens = Math.max(
      0,
      Math.min(maxTokens - 1, Math.floor(options.overlapTokens ?? 0)),
    );

    const resolved = this.resolveTokenizer(options);
    const tokens = resolved.encoding.encode(text);

    if (tokens.length === 0) {
      return {
        encoding: resolved.encodingName,
        tokenCount: 0,
        chunkCount: 0,
        chunks: [],
      };
    }

    const chunks: IAiTokenChunk[] = [];
    let startToken = 0;
    let index = 0;

    while (startToken < tokens.length) {
      const endToken = Math.min(tokens.length, startToken + maxTokens);
      const slice = tokens.slice(startToken, endToken);

      chunks.push({
        index,
        text: this.decodeTokens(resolved.encoding, slice),
        tokenCount: slice.length,
        startToken,
        endToken,
      });

      if (endToken >= tokens.length) {
        break;
      }

      startToken = Math.max(startToken + 1, endToken - overlapTokens);
      index += 1;
    }

    return {
      encoding: resolved.encodingName,
      tokenCount: tokens.length,
      chunkCount: chunks.length,
      chunks,
    };
  }

  chunkInput(
    input: string | IAiContext,
    options: IAiTokenChunkOptions,
  ): IAiTokenChunkResult {
    return this.chunkText(this.resolveInputToText(input), options);
  }

  private resolveInputToText(input: string | IAiContext): string {
    if (typeof input === "string") {
      return input;
    }

    const parts: string[] = [];

    if (input.systemPrompt) {
      parts.push(this.serializeMessage(input.systemPrompt));
    }

    for (const message of input.chatMessages) {
      parts.push(this.serializeMessage(message));
    }

    return parts.join("\n");
  }

  private serializeMessage(message: IChatMessage): string {
    return this.serializeMessageContent(message.content);
  }

  private serializeMessageContent(content: AiMessageContent): string {
    if (typeof content === "string") {
      return content;
    }

    return content
      .map((part) => this.serializePart(part))
      .filter((value) => value.length > 0)
      .join(" ");
  }

  private serializePart(part: AiContentPart): string {
    switch (part.type) {
      case "text":
        return part.text;
      case "thinking":
        return part.redacted ? "[redacted thinking]" : part.text;
      case "tool_call": {
        const args = JSON.stringify(part.arguments ?? {});
        return `${part.name}(${args})`;
      }
      case "tool_result":
        return this.serializeMessageContent(part.content);
      case "image":
        return "[image]";
      case "file":
        return "[file]";
      default:
        return "";
    }
  }

  private resolveTokenizer(
    options?: IAiTokenizerResolveOptions,
  ): { encodingName: string; encoding: Tiktoken } {
    const model = this.resolveModelName(options);

    if (model) {
      try {
        return {
          encodingName: `model:${model}`,
          encoding: encodingForModel(model as TiktokenModel),
        };
      } catch {
        // Fall back below for unsupported model names, for example many local models.
      }
    }

    return {
      encodingName: DEFAULT_ENCODING,
      encoding: getEncoding(DEFAULT_ENCODING),
    };
  }

  private resolveModelName(
    options?: IAiTokenizerResolveOptions,
  ): string | undefined {
    const directModel = options?.model?.trim();

    if (directModel) {
      return directModel;
    }

    const providerSelection = options?.providerSelection?.trim();

    if (!providerSelection) {
      return undefined;
    }

    const separatorIndex = providerSelection.indexOf(":");

    if (separatorIndex < 0) {
      return undefined;
    }

    const model = providerSelection.slice(separatorIndex + 1).trim();

    return model || undefined;
  }

  private decodeTokens(encoding: Tiktoken, tokens: number[]): string {
    return encoding.decode(tokens);
  }
}
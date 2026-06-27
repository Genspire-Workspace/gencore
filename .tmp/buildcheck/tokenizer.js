// @bun
// packages/ai/src/application/services/ai-tokenizer-service.ts
import {
  encodingForModel,
  getEncoding
} from "js-tiktoken";
var DEFAULT_ENCODING = "cl100k_base";

class AiTokenizerService {
  countTokens(input, options) {
    const resolved = this.resolveTokenizer(options);
    const text = this.resolveInputToText(input);
    const tokens = resolved.encoding.encode(text);
    return {
      encoding: resolved.encodingName,
      tokenCount: tokens.length
    };
  }
  chunkText(text, options) {
    const maxTokens = Math.max(1, Math.floor(options.maxTokens));
    const overlapTokens = Math.max(0, Math.min(maxTokens - 1, Math.floor(options.overlapTokens ?? 0)));
    const resolved = this.resolveTokenizer(options);
    const tokens = resolved.encoding.encode(text);
    if (tokens.length === 0) {
      return {
        encoding: resolved.encodingName,
        tokenCount: 0,
        chunkCount: 0,
        chunks: []
      };
    }
    const chunks = [];
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
        endToken
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
      chunks
    };
  }
  chunkInput(input, options) {
    return this.chunkText(this.resolveInputToText(input), options);
  }
  resolveInputToText(input) {
    if (typeof input === "string") {
      return input;
    }
    const parts = [];
    if (input.systemPrompt) {
      parts.push(this.serializeMessage(input.systemPrompt));
    }
    for (const message of input.chatMessages) {
      parts.push(this.serializeMessage(message));
    }
    return parts.join(`
`);
  }
  serializeMessage(message) {
    return this.serializeMessageContent(message.content);
  }
  serializeMessageContent(content) {
    if (typeof content === "string") {
      return content;
    }
    return content.map((part) => this.serializePart(part)).filter((value) => value.length > 0).join(" ");
  }
  serializePart(part) {
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
      default:
        return "";
    }
  }
  resolveTokenizer(options) {
    const model = this.resolveModelName(options);
    if (model) {
      try {
        return {
          encodingName: `model:${model}`,
          encoding: encodingForModel(model)
        };
      } catch {}
    }
    return {
      encodingName: DEFAULT_ENCODING,
      encoding: getEncoding(DEFAULT_ENCODING)
    };
  }
  resolveModelName(options) {
    const directModel = options?.model?.trim();
    if (directModel) {
      return directModel;
    }
    const providerSelection = options?.providerSelection?.trim();
    if (!providerSelection) {
      return;
    }
    const separatorIndex = providerSelection.indexOf(":");
    if (separatorIndex < 0) {
      return;
    }
    const model = providerSelection.slice(separatorIndex + 1).trim();
    return model || undefined;
  }
  decodeTokens(encoding, tokens) {
    return encoding.decode(tokens);
  }
}
// packages/ai/src/extension/ai-tokenizer-extension.ts
function aiTokenizerExtension() {
  return {
    name: "ai-tokenizer",
    register(app) {
      app.provide(AiTokenizerService, new AiTokenizerService);
    }
  };
}
export {
  aiTokenizerExtension,
  AiTokenizerService
};

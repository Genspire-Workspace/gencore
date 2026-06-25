// file: packages\ai\src\clients\openai-compatible\openai-compatible-embedding-generator.ts

import type { IEmbeddingGenerator } from "../../embeddings/embedding-generator.js";
import type { IEmbeddingGenerationRequest } from "../../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../embeddings/embedding-generation-response.js";
import type { IOpenAICompatibleClientOptions } from "./openai-compatible-client-options.js";
import { AiError } from "../../errors/ai-error.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embed, embedMany } from "ai";

export class OpenAICompatibleEmbeddingGenerator implements IEmbeddingGenerator {
  private readonly options: IOpenAICompatibleClientOptions;

  constructor(options: IOpenAICompatibleClientOptions) {
    this.options = options;
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    const modelId = request.model ?? this.options.defaultModel;
    if (!modelId) {
      throw new AiError(
        "No embedding model specified. Provide a model in the request or set a defaultModel in client options.",
      );
    }

    const provider = this.createProvider(request.apiKey);
    const model = provider.embeddingModel(modelId);

    if (Array.isArray(request.input)) {
      const result = await embedMany({
        model,
        values: request.input,
        abortSignal: request.signal,
      });

      return {
        provider: this.options.id,
        model: modelId,
        embeddings: result.embeddings.map((e, i) => ({
          index: i,
          embedding: e,
        })),
        usage: result.usage
          ? {
              inputTokens: result.usage.tokens,
              totalTokens: result.usage.tokens,
            }
          : undefined,
        raw: result,
      };
    }

    const result = await embed({
      model,
      value: request.input,
      abortSignal: request.signal,
    });

    return {
      provider: this.options.id,
      model: modelId,
      embeddings: [{ index: 0, embedding: result.embedding }],
      usage: result.usage
        ? {
            inputTokens: result.usage.tokens,
            totalTokens: result.usage.tokens,
          }
        : undefined,
      raw: result,
    };
  }

  private createProvider(apiKey?: string) {
    return createOpenAICompatible({
      name: this.options.id,
      baseURL: this.options.baseURL,
      apiKey: apiKey ?? this.options.apiKey,
      headers: this.options.headers,
      queryParams: this.options.queryParams,
      fetch: this.options.fetch,
    });
  }
}

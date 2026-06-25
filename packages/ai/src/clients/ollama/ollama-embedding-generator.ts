// file: packages\ai\src\clients\ollama\ollama-embedding-generator.ts

import type { IEmbeddingGenerator } from "../../embeddings/embedding-generator.js";
import type { IEmbeddingGenerationRequest } from "../../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../embeddings/embedding-generation-response.js";
import type { IOllamaClientOptions } from "./ollama-client-options.js";
import { AiError } from "../../errors/ai-error.js";
import { Ollama } from "ollama";

export class OllamaEmbeddingGenerator implements IEmbeddingGenerator {
  private readonly options: IOllamaClientOptions;
  private readonly client: Ollama;

  constructor(options: IOllamaClientOptions) {
    this.options = options;
    this.client = new Ollama({
      host: options.host,
      fetch: options.fetch,
      proxy: options.proxy,
      headers: options.headers,
    });
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

    const response = await this.client.embed({
      model: modelId,
      input: request.input,
      dimensions: request.dimensions,
    });

    return {
      provider: this.options.id,
      model: modelId,
      embeddings: response.embeddings.map((embedding, i) => ({
        index: i,
        embedding,
      })),
      usage: response.prompt_eval_count
        ? {
            inputTokens: response.prompt_eval_count,
            totalTokens: response.prompt_eval_count,
          }
        : undefined,
      raw: response,
    };
  }
}

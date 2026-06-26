// file: apps\playground-api\src\ai\generation\ai-embedding.controller.ts

import {
  AllowAnonymous,
  Controller,
  Post,
  RequestContext,
} from "@genspire/server";
import { aiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import {
  AiEmbeddingRequestDto,
  AiEmbeddingResponseDto,
} from "./ai.dto.js";

@Controller("/ai", {
  tag: "AI",
  description: "AI embedding generation endpoints",
})
export class AiEmbeddingController {
  @AllowAnonymous()
  @Post("/embeddings", {
    summary: "Generate embeddings",
    request: AiEmbeddingRequestDto,
    response: AiEmbeddingResponseDto,
  })
  async generateEmbedding(ctx: RequestContext) {
    const body = await ctx.json<AiEmbeddingRequestDto>();
    const resolved = aiPlaygroundRuntime.resolver.resolve({
      provider: body.provider,
      model: body.model,
      kind: "embedding",
    });
    const response = await aiPlaygroundRuntime.service.generateEmbedding({
      provider: resolved.provider,
      model: resolved.model,
      apiKey: body.apiKey,
      apiKeyId: body.apiKeyId,
      userId: body.userId,
      input: body.input,
      dimensions: body.dimensions,
      metadata: body.metadata,
    });

    return {
      provider: response.provider,
      model: response.model,
      embeddings: response.embeddings,
      usage: response.usage as Record<string, unknown> | undefined,
      metadata: response.metadata,
    };
  }
}

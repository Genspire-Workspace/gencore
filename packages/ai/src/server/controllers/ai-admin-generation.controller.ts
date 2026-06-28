// file: packages/ai/src/server/controllers/ai-admin-generation.controller.ts

import {
  Authorize,
  Controller,
  Post,
  RequestContext,
} from "@genspire/server";
import { AiAdminGenerationService } from "../../application/services/index.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import {
  AiAdminChatGenerateRequestDto,
  AiAdminChatGenerateResponseDto,
  AiEmbeddingGenerateRequestDto,
  AiEmbeddingGenerateResponseDto,
  AiSseEventDto,
} from "../dtos/ai-admin.dto.js";
import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationSettings } from "../../domain/chat/chat-generation-settings.js";
import type { IChatMessage } from "../../domain/chat/chat-message.js";

function toTools(tools: AiAdminChatGenerateRequestDto["tools"]): IAiTool[] | undefined {
  return tools?.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    returnDirect: tool.returnDirect,
    metadata: tool.metadata,
  }));
}

function toSettings(
  settings: AiAdminChatGenerateRequestDto["settings"],
): (IChatGenerationSettings & { stream?: boolean }) | undefined {
  if (!settings) {
    return undefined;
  }

  return {
    stream: settings.stream,
    reasoningEffort: settings.reasoningEffort,
    temperature: settings.temperature,
    topP: settings.topP,
    maxTokens: settings.maxTokens,
    stop: settings.stop,
    toolChoice: settings.toolChoice as IChatGenerationSettings["toolChoice"],
    maxToolSteps: settings.maxToolSteps,
    metadata: settings.metadata,
  };
}

function toMessages(body: AiAdminChatGenerateRequestDto): IChatMessage[] {
  return [
    ...(body.systemPrompt
      ? [{ role: "system" as const, content: body.systemPrompt }]
      : []),
    ...body.messages.map((message) => ({
      role: message.role,
      content: message.content as IChatMessage["content"],
      ...(message.name ? { name: message.name } : {}),
      ...(message.metadata ? { metadata: message.metadata } : {}),
    })),
  ];
}

function toSseResponse(events: AsyncIterable<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          const payload = event as { type?: string };
          controller.enqueue(
            encoder.encode(
              `event: ${payload.type ?? "message"}\ndata: ${JSON.stringify(event)}\n\n`,
            ),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

@Authorize({ roles: ["admin"] })
@Controller("/ai/admin", {
  tag: "AI Admin",
  description: "Admin-only raw AI generation endpoints",
})
export class AiAdminGenerationController {
  static inject = [AiAdminGenerationService];

  constructor(private readonly service: AiAdminGenerationService) {}

  @Post("/chat/generate", {
    summary: "Generate a raw chat completion",
    request: AiAdminChatGenerateRequestDto,
    response: AiAdminChatGenerateResponseDto,
    responses: {
      200: {
        description: "JSON or SSE stream response",
        body: AiSseEventDto,
      },
    },
  })
  async generateChat(ctx: RequestContext) {
    const body = await ctx.json<AiAdminChatGenerateRequestDto>();
    const request: IChatGenerationRequest = {
      provider: body.provider,
      model: body.model,
      settings: toSettings(body.settings),
      messages: toMessages(body),
      tools: toTools(body.tools),
      metadata: body.metadata,
    };

    if (body.settings?.stream === true) {
      return toSseResponse(this.service.streamChat(request));
    }

    const response = await this.service.generateChat(request);
    return {
      id: response.id,
      provider: response.provider,
      model: response.model,
      message: response.message,
      finishReason: response.finishReason,
      usage: response.usage as Record<string, unknown> | undefined,
      metadata: response.metadata,
      toolCalls: response.toolCalls as unknown[] | undefined,
      toolResults: response.toolResults as unknown[] | undefined,
    };
  }

  @Post("/embeddings/generate", {
    summary: "Generate embeddings",
    request: AiEmbeddingGenerateRequestDto,
    response: AiEmbeddingGenerateResponseDto,
  })
  async generateEmbedding(ctx: RequestContext) {
    const body = await ctx.json<AiEmbeddingGenerateRequestDto>();
    const response = await this.service.generateEmbedding({
      provider: body.provider,
      model: body.model,
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

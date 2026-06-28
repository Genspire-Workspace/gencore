// file: packages\ai\src\server\controllers\ai-provider.controller.ts

import {
  Authorize,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  RequestContext,
  defineProblemDetailsType,
  json,
  problem,
} from "@genspire/server";
import { requireCurrentUser } from "@genspire/auth";
import { GenError } from "@genspire/core";
import type { AiApiKeySource } from "../../domain/models/ai-api-key.js";
import type { AiProviderClientKind } from "../../providers/ai-provider-client-kind.js";
import type { AiProviderKind } from "../../domain/models/ai-provider.js";
import type { IAiModelCapabilities } from "../../domain/models/ai-model-capabilities.js";
import {
  AiApiKeyService,
  AiModelService,
  AiProviderService,
} from "../../application/services/index.js";
import {
  AiApiKeyListResponseDto,
  AiApiKeyResponseDto,
  AiModelListResponseDto,
  AiModelResponseDto,
  AiProviderListResponseDto,
  AiProviderResponseDto,
  CreateAiApiKeyRequestDto,
  CreateAiModelRequestDto,
  CreateAiProviderRequestDto,
  DeleteAiProviderResponseDto,
  UpdateAiApiKeyRequestDto,
  UpdateAiModelRequestDto,
  UpdateAiProviderRequestDto,
} from "../dtos/ai-provider.dto.js";

function mapProviderError(error: unknown): Response | null {
  if (!(error instanceof GenError)) {
    return null;
  }

  switch (error.code) {
    case "AI_PROVIDER_NOT_FOUND":
      return problem({ status: 404, title: "AI provider not found" });
    case "AI_MODEL_NOT_FOUND":
      return problem({ status: 404, title: "AI model not found" });
    case "AI_API_KEY_NOT_FOUND":
      return problem({ status: 404, title: "AI API key not found" });
    case "AI_ADMIN_REQUIRED":
      return problem({ status: 403, title: "Forbidden", detail: error.message, code: error.code });
    case "AI_PROVIDER_NAME_REQUIRED":
    case "AI_PROVIDER_NAME_TAKEN":
    case "AI_MODEL_NAME_REQUIRED":
    case "AI_MODEL_NAME_TAKEN":
    case "AI_API_KEY_NAME_REQUIRED":
    case "AI_API_KEY_VALUE_REQUIRED":
    case "AI_API_KEY_EXISTS":
      return problem({ status: 400, title: "Bad Request", detail: error.message, code: error.code });
    default:
      return null;
  }
}

function handle(error: unknown): Response {
  return mapProviderError(error) ?? problem({ status: 500, title: "Internal Server Error" });
}

@Authorize()
@Controller("/ai/providers", {
  tag: "AI Providers",
  description: "CRUD endpoints for AI providers, their models, and per-user API keys",
})
export class AiProviderController {
  static inject = [
    AiProviderService,
    AiModelService,
    AiApiKeyService,
  ];

  constructor(
    private readonly providerService: AiProviderService,
    private readonly modelService: AiModelService,
    private readonly apiKeyService: AiApiKeyService,
  ) {}

  @Get("/", {
    summary: "List AI providers",
    response: AiProviderListResponseDto,
  })
  async list(ctx: RequestContext) {
    try {
      return await this.providerService.list();
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Post("/", {
    summary: "Create an AI provider",
    request: CreateAiProviderRequestDto,
    response: AiProviderResponseDto,
  })
  async create(ctx: RequestContext) {
    try {
      const body = await ctx.json<CreateAiProviderRequestDto>();
      return json(
        await this.providerService.create({
          currentUser: requireCurrentUser(ctx),
          id: body.id,
          name: body.name,
          kind: body.kind as AiProviderKind,
          clientKind: body.clientKind as AiProviderClientKind,
          baseUrl: body.baseUrl ?? null,
          api: body.api ?? null,
          doc: body.doc ?? null,
          website: body.website ?? null,
          metadata: body.metadata ?? null,
        }),
        { status: 201 },
      );
    } catch (error) {
      return handle(error);
    }
  }

  @Get("/:id", {
    summary: "Get an AI provider by id",
    response: AiProviderResponseDto,
    responses: {
      404: {
        description: "Provider not found",
        body: defineProblemDetailsType("Provider not found problem response"),
      },
    },
  })
  async getById(ctx: RequestContext) {
    try {
      return await this.providerService.getById(ctx.params.id!);
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Patch("/:id", {
    summary: "Update an AI provider",
    request: UpdateAiProviderRequestDto,
    response: AiProviderResponseDto,
  })
  async update(ctx: RequestContext) {
    try {
      const body = await ctx.json<UpdateAiProviderRequestDto>();
      return await this.providerService.update({
        currentUser: requireCurrentUser(ctx),
        providerId: ctx.params.id!,
        name: body.name,
        kind: body.kind as AiProviderKind | undefined,
        clientKind: body.clientKind as AiProviderClientKind | undefined,
        baseUrl: body.baseUrl,
        api: body.api,
        doc: body.doc,
        website: body.website,
        metadata: body.metadata,
      });
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Delete("/:id", {
    summary: "Delete an AI provider and its models and API keys",
    response: DeleteAiProviderResponseDto,
  })
  async delete(ctx: RequestContext) {
    try {
      return await this.providerService.delete(requireCurrentUser(ctx), ctx.params.id!);
    } catch (error) {
      return handle(error);
    }
  }

  @Get("/:id/models", {
    summary: "List models for an AI provider",
    response: AiModelListResponseDto,
  })
  async listModels(ctx: RequestContext) {
    try {
      return await this.modelService.listByProvider(ctx.params.id!);
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Post("/:id/models", {
    summary: "Add a model to an AI provider",
    request: CreateAiModelRequestDto,
    response: AiModelResponseDto,
  })
  async createModel(ctx: RequestContext) {
    try {
      const body = await ctx.json<CreateAiModelRequestDto>();
      return json(
        await this.modelService.create({
          currentUser: requireCurrentUser(ctx),
          providerId: ctx.params.id!,
          name: body.name,
          family: body.family ?? null,
          capabilities: (body.capabilities as IAiModelCapabilities | undefined) ?? null,
          metadata: body.metadata ?? null,
        }),
        { status: 201 },
      );
    } catch (error) {
      return handle(error);
    }
  }

  @Get("/:id/models/:modelId", {
    summary: "Get a model by id",
    response: AiModelResponseDto,
  })
  async getModel(ctx: RequestContext) {
    try {
      return await this.modelService.getById(ctx.params.modelId!);
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Patch("/:id/models/:modelId", {
    summary: "Update a model",
    request: UpdateAiModelRequestDto,
    response: AiModelResponseDto,
  })
  async updateModel(ctx: RequestContext) {
    try {
      const body = await ctx.json<UpdateAiModelRequestDto>();
      return await this.modelService.update({
        currentUser: requireCurrentUser(ctx),
        modelId: ctx.params.modelId!,
        name: body.name,
        family: body.family,
        capabilities: body.capabilities as IAiModelCapabilities | undefined,
        metadata: body.metadata,
      });
    } catch (error) {
      return handle(error);
    }
  }

  @Authorize({ roles: ["admin"] })
  @Delete("/:id/models/:modelId", {
    summary: "Delete a model",
    response: DeleteAiProviderResponseDto,
  })
  async deleteModel(ctx: RequestContext) {
    try {
      return await this.modelService.delete(requireCurrentUser(ctx), ctx.params.modelId!);
    } catch (error) {
      return handle(error);
    }
  }

  @Get("/:id/api-keys", {
    summary: "List API keys for an AI provider (own keys, or all for admins)",
    response: AiApiKeyListResponseDto,
  })
  async listApiKeys(ctx: RequestContext) {
    try {
      return await this.apiKeyService.listByProvider(requireCurrentUser(ctx), ctx.params.id!);
    } catch (error) {
      return handle(error);
    }
  }

  @Post("/:id/api-keys", {
    summary: "Create an API key for an AI provider for the current user",
    request: CreateAiApiKeyRequestDto,
    response: AiApiKeyResponseDto,
  })
  async createApiKey(ctx: RequestContext) {
    try {
      const body = await ctx.json<CreateAiApiKeyRequestDto>();
      return json(
        await this.apiKeyService.create({
          currentUser: requireCurrentUser(ctx),
          providerId: ctx.params.id!,
          name: body.name,
          value: body.value ?? null,
          env: body.env ?? null,
          enabled: body.enabled,
          source: body.source as AiApiKeySource | undefined,
          metadata: body.metadata ?? null,
        }),
        { status: 201 },
      );
    } catch (error) {
      return handle(error);
    }
  }

  @Patch("/:id/api-keys/:keyId", {
    summary: "Update an API key (own key, or any for admins)",
    request: UpdateAiApiKeyRequestDto,
    response: AiApiKeyResponseDto,
  })
  async updateApiKey(ctx: RequestContext) {
    try {
      const body = await ctx.json<UpdateAiApiKeyRequestDto>();
      return await this.apiKeyService.update({
        currentUser: requireCurrentUser(ctx),
        apiKeyId: ctx.params.keyId!,
        name: body.name,
        value: body.value,
        env: body.env,
        enabled: body.enabled,
        source: body.source as AiApiKeySource | undefined,
        metadata: body.metadata,
      });
    } catch (error) {
      return handle(error);
    }
  }

  @Delete("/:id/api-keys/:keyId", {
    summary: "Delete an API key (own key, or any for admins)",
    response: DeleteAiProviderResponseDto,
  })
  async deleteApiKey(ctx: RequestContext) {
    try {
      return await this.apiKeyService.delete(requireCurrentUser(ctx), ctx.params.keyId!);
    } catch (error) {
      return handle(error);
    }
  }
}
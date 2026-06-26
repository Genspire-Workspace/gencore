import { Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import { HttpError } from "@genspire/server";
import { AiPromptRenderer } from "../../../../../packages/ai/src/prompts/ai-prompt-renderer.js";
import type { IChatGenerationRequest } from "../../../../../packages/ai/src/chat/chat-generation-request.js";
import type { IChatMessage } from "../../../../../packages/ai/src/chat/chat-message.js";
import type { IAiTool } from "../../../../../packages/ai/src/tools/ai-tool.js";
import type { IChatGenerationSettings } from "../../../../../packages/ai/src/chat/chat-generation-settings.js";
import { aiPlaygroundRuntime, type IAiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import type { AiChatRequestDto, AiChatSettingsDto, AiChatToolDto, AiToolExecutionModeDto } from "./ai.dto.js";
import { AiPromptService } from "../prompts/ai-prompt.service.js";
import { AiSkillService } from "../skills/ai-skill.service.js";
import {
  createToolExecutionModeMap,
  resolveExecutionMode,
  toChatMessage,
  toChatSettings,
  toDeclarativeTool,
} from "../shared/ai-chat-helpers.js";

export interface IComposeChatRequestInput {
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyId?: string;
  userId?: string;
  systemPrompt?: string;
  messages: AiChatRequestDto["messages"];
  tools?: AiChatToolDto[];
  settings?: AiChatSettingsDto;
  metadata?: Record<string, unknown>;
  promptIds?: string[];
  skillIds?: string[];
  promptVariables?: Record<string, unknown>;
}

export interface IComposeChatRequestResult {
  request: IChatGenerationRequest;
  toolExecutionModes: Map<string, AiToolExecutionModeDto>;
}

function mergeMetadata(
  ...values: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const result = Object.assign({}, ...values.filter(Boolean));
  return Object.keys(result).length > 0 ? result : undefined;
}

@Scoped()
export class AiRequestComposerService {
  static inject = [AiPromptService, AiSkillService];

  private readonly promptRenderer = new AiPromptRenderer();

  constructor(
    private readonly promptService: AiPromptService,
    private readonly skillService: AiSkillService,
  ) {}

  async composeChatRequest(
    input: IComposeChatRequestInput,
    currentUser: ICurrentUser | null,
    runtime: IAiPlaygroundRuntime = aiPlaygroundRuntime,
  ): Promise<IComposeChatRequestResult> {
    const resolved = runtime.resolver.resolve({
      provider: input.provider,
      model: input.model,
      kind: "chat",
    });
    const renderedPrompts = input.promptIds?.length
      ? await this.promptService.resolvePromptsByIds(currentUser, input.promptIds)
      : [];
    const skills = input.skillIds?.length
      ? await this.skillService.resolveSkillsByIds(currentUser, input.skillIds)
      : [];
    const messages: IChatMessage[] = [];
    const toolExecutionModes = createToolExecutionModeMap(input.tools);
    const tools = new Map<string, IAiTool>();

    if (input.systemPrompt?.trim()) {
      messages.push({
        role: "system",
        content: input.systemPrompt.trim(),
      });
    }

    for (const skill of skills) {
      if (skill.instructions?.trim()) {
        messages.push({
          role: "system",
          content: skill.instructions.trim(),
        });
      }
    }

    for (const prompt of renderedPrompts) {
      const rendered = this.promptRenderer.render(prompt, {
        variables: input.promptVariables,
        metadata: input.metadata,
      });

      messages.push(
        ...rendered.messages.map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.name ? { name: message.name } : {}),
          ...(message.metadata ? { metadata: message.metadata } : {}),
        })),
      );
    }

    for (const skill of skills) {
      for (const prompt of skill.prompts ?? []) {
        const rendered = this.promptRenderer.render(prompt, {
          variables: input.promptVariables,
          metadata: input.metadata,
          keepUnresolvedPlaceholders: true,
        });

        messages.push(
          ...rendered.messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.name ? { name: message.name } : {}),
            ...(message.metadata ? { metadata: message.metadata } : {}),
          })),
        );
      }
    }

    messages.push(...(input.messages ?? []).map((message) => toChatMessage(message)));

    for (const skill of skills) {
      for (const tool of skill.tools ?? []) {
        const existing = tools.get(tool.name);

        if (existing && existing !== tool) {
          throw new HttpError(400, `Duplicate AI tool '${tool.name}' was provided by multiple skills.`);
        }

        tools.set(tool.name, tool);
        toolExecutionModes.set(tool.name, "server");
      }
    }

    for (const toolDto of input.tools ?? []) {
      const executionMode = resolveExecutionMode(toolDto.executionMode);

      if (tools.has(toolDto.name)) {
        throw new HttpError(400, `Duplicate AI tool '${toolDto.name}' was provided explicitly and by a skill.`);
      }

      const tool = toDeclarativeTool(toolDto, runtime);
      tools.set(tool.name, tool);
      toolExecutionModes.set(tool.name, executionMode);
    }

    return {
      request: {
        provider: resolved.provider,
        model: resolved.model,
        apiKey: input.apiKey,
        apiKeyId: input.apiKeyId,
        userId: input.userId,
        messages,
        tools: tools.size > 0 ? [...tools.values()] : undefined,
        metadata: mergeMetadata(
          input.metadata,
          input.settings?.metadata,
          input.promptIds?.length ? { promptIds: input.promptIds } : undefined,
          input.skillIds?.length ? { skillIds: input.skillIds } : undefined,
        ),
        settings: toChatSettings(input.settings) as IChatGenerationSettings | undefined,
      },
      toolExecutionModes,
    };
  }
}

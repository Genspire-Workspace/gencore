import { Scoped, registerEventHandlerMetadata } from "@genspire/core";
import {
  AI_PROMPT_RESOLVE_REQUESTED_EVENT,
  type IAiPromptResolveRequestedEventPayload,
} from "@genspire/ai/application";
import { AiPromptService } from "./ai-prompt.service.js";

@Scoped()
export class AiPromptEventSubscriber {
  static inject = [AiPromptService];

  constructor(private readonly promptService: AiPromptService) {}

  async handlePromptResolveRequest(
    event: { payload: IAiPromptResolveRequestedEventPayload },
  ): Promise<void> {
    event.payload.prompt = await this.promptService.resolvePrompt(
      event.payload.currentUser,
      event.payload.reference,
    );
  }
}

registerEventHandlerMetadata(
  AiPromptEventSubscriber,
  AI_PROMPT_RESOLVE_REQUESTED_EVENT,
  "handlePromptResolveRequest",
);

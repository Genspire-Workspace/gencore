// file: packages\ai\src\prompts\ai-prompt-renderer.ts

import { AiError } from "../errors/ai-error.js";
import type {
  AiContentPart,
  AiMessageContent,
  IAiThinkingPart,
  IAiToolResultPart,
} from "../common/ai-content-part.js";
import type { IAiMessage } from "../common/ai-message.js";
import type {
  IAiPrompt,
  IAiPromptRenderInput,
  IAiPromptVariable,
  IAiRenderedPrompt,
} from "./ai-prompt.js";

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

export class AiPromptRenderer {
  render(prompt: IAiPrompt, input?: IAiPromptRenderInput): IAiRenderedPrompt {
    const resolvedVariables = this.resolveVariables(
      prompt,
      input?.variables ?? {},
    );
    const messages =
      typeof prompt.template === "string"
        ? [
            {
              role: "user",
              content: this.renderText(prompt, prompt.template, resolvedVariables),
            } satisfies IAiMessage,
          ]
        : prompt.template.map((message) =>
            this.renderMessage(prompt, message, resolvedVariables)
          );

    return {
      messages,
      metadata: input?.metadata ?? prompt.metadata,
    };
  }

  private resolveVariables(
    prompt: IAiPrompt,
    inputVariables: Record<string, unknown>,
  ): Map<string, unknown> {
    const resolvedVariables = new Map<string, unknown>();

    for (const variable of prompt.variables ?? []) {
      const hasInputValue = Object.prototype.hasOwnProperty.call(
        inputVariables,
        variable.name,
      );

      if (hasInputValue) {
        resolvedVariables.set(variable.name, inputVariables[variable.name]);
        continue;
      }

      if (variable.defaultValue !== undefined) {
        resolvedVariables.set(variable.name, variable.defaultValue);
        continue;
      }

      if (variable.required) {
        throw new AiError(
          `AI prompt '${prompt.id}' is missing required variable '${variable.name}'.`,
        );
      }
    }

    return resolvedVariables;
  }

  private renderMessage(
    prompt: IAiPrompt,
    message: IAiMessage,
    variables: Map<string, unknown>,
  ): IAiMessage {
    return {
      ...message,
      name: message.name ? this.renderText(prompt, message.name, variables) : undefined,
      content: this.renderContent(prompt, message.content, variables),
      metadata: message.metadata ? { ...message.metadata } : undefined,
    };
  }

  private renderContent(
    prompt: IAiPrompt,
    content: AiMessageContent,
    variables: Map<string, unknown>,
  ): AiMessageContent {
    if (typeof content === "string") {
      return this.renderText(prompt, content, variables);
    }

    return content.map((part) => this.renderPart(prompt, part, variables));
  }

  private renderPart(
    prompt: IAiPrompt,
    part: AiContentPart,
    variables: Map<string, unknown>,
  ): AiContentPart {
    switch (part.type) {
      case "text":
        return {
          ...part,
          text: this.renderText(prompt, part.text, variables),
        };
      case "thinking":
        return this.renderThinkingPart(prompt, part, variables);
      case "tool_result":
        return this.renderToolResultPart(prompt, part, variables);
      default:
        return { ...part };
    }
  }

  private renderThinkingPart(
    prompt: IAiPrompt,
    part: IAiThinkingPart,
    variables: Map<string, unknown>,
  ): IAiThinkingPart {
    return {
      ...part,
      text: this.renderText(prompt, part.text, variables),
    };
  }

  private renderToolResultPart(
    prompt: IAiPrompt,
    part: IAiToolResultPart,
    variables: Map<string, unknown>,
  ): IAiToolResultPart {
    return {
      ...part,
      content: this.renderContent(prompt, part.content, variables),
    };
  }

  private renderText(
    prompt: IAiPrompt,
    text: string,
    variables: Map<string, unknown>,
  ): string {
    return text.replaceAll(PLACEHOLDER_PATTERN, (_match, variableName: string) => {
      if (!variables.has(variableName)) {
        throw new AiError(
          `AI prompt '${prompt.id}' could not resolve variable '${variableName}'.`,
        );
      }

      return String(variables.get(variableName));
    });
  }
}

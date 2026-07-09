import type {
  AiContentPart,
  IAiSseEventDto,
  AiMessageContent,
} from "../../domain/types/ai-session-sdk-types.js";

export interface IAiSessionStreamAssembly {
  assistantText: string;
  parts: AiContentPart[];
  finalContent: AiMessageContent | null;
  finished: boolean;
  error: string | null;
}

export function createAiSessionStreamAssembly(): IAiSessionStreamAssembly {
  return {
    assistantText: "",
    parts: [],
    finalContent: null,
    finished: false,
    error: null,
  };
}

export function applyAiSessionStreamChunk(
  current: IAiSessionStreamAssembly,
  chunk: IAiSseEventDto,
): IAiSessionStreamAssembly {
  const next: IAiSessionStreamAssembly = {
    ...current,
  };

  if (chunk.type === "delta" && typeof chunk.delta === "string") {
    next.assistantText += chunk.delta;
    appendTextPart(next.parts, chunk.delta);
  }

  if (chunk.type === "reasoning_delta" && typeof chunk.reasoningDelta === "string") {
    appendThinkingPart(next.parts, chunk.reasoningDelta);
  }

  if (chunk.type === "tool_call" && chunk.toolCall && typeof chunk.toolCall === "object") {
    const toolCall = chunk.toolCall as {
      id?: unknown;
      name?: unknown;
      arguments?: unknown;
    };
    next.parts.push({
      type: "tool_call",
      id: typeof toolCall.id === "string" ? toolCall.id : crypto.randomUUID(),
      name: typeof toolCall.name === "string" ? toolCall.name : "tool",
      arguments:
        toolCall.arguments && typeof toolCall.arguments === "object"
          ? (toolCall.arguments as Record<string, unknown>)
          : {},
    });
  }

  if (chunk.type === "tool_result" && chunk.toolResult && typeof chunk.toolResult === "object") {
    const toolResult = chunk.toolResult as {
      toolCallId?: unknown;
      content?: unknown;
    };
    next.parts.push({
      type: "tool_result",
      toolCallId:
        typeof toolResult.toolCallId === "string"
          ? toolResult.toolCallId
          : crypto.randomUUID(),
      content: (toolResult.content ?? "") as AiMessageContent,
    });
  }

  if (chunk.message?.role === "assistant") {
    next.finalContent = chunk.message.content;
  }

  if (chunk.type === "completed") {
    next.finished = true;
  }

  if (chunk.type === "error" && typeof chunk.error === "string") {
    next.error = chunk.error;
    next.finished = true;
  }

  return next;
}

export function resolveAiSessionAssistantText(
  state: IAiSessionStreamAssembly,
): string {
  const finalText = readAiContentText(state.finalContent);
  return finalText || state.assistantText;
}

export function resolveAiSessionAssistantContent(
  state: IAiSessionStreamAssembly,
): AiMessageContent {
  if (state.finalContent !== null) {
    return state.finalContent;
  }

  if (state.parts.length === 0) {
    return state.assistantText;
  }

  if (
    state.parts.length === 1 &&
    state.parts[0]?.type === "text" &&
    typeof state.parts[0].text === "string"
  ) {
    return state.parts[0].text;
  }

  return state.parts;
}

export function readAiContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }

        return "";
      })
      .join("");
  }

  if (content === null || content === undefined) {
    return "";
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

function appendTextPart(parts: AiContentPart[], text: string): void {
  const lastPart = parts[parts.length - 1];
  if (lastPart?.type === "text") {
    lastPart.text += text;
    return;
  }

  parts.push({
    type: "text",
    text,
  });
}

function appendThinkingPart(parts: AiContentPart[], text: string): void {
  const lastPart = parts[parts.length - 1];
  if (lastPart?.type === "thinking" && lastPart.redacted !== true) {
    lastPart.text += text;
    return;
  }

  parts.push({
    type: "thinking",
    text,
    redacted: false,
  });
}

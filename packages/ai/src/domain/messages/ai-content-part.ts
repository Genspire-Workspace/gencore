// file: packages/ai/src/domain/messages/ai-content-part.ts

export type AiContentPartType =
  | "text"
  | "image"
  | "tool_call"
  | "tool_result"
  | "thinking"
  | "file";

export interface IAiTextPart {
  type: "text";
  text: string;
}

export type AiContentData = string | Uint8Array | ArrayBuffer | URL;

export interface IAiDataPart {
  data: AiContentData;
  mediaType: string;
}

export interface IAiImagePart extends IAiDataPart {
  type: "image";
}

export interface IAiFilePart extends IAiDataPart {
  type: "file";
  filename?: string;
}

export interface IAiToolCallPart<TArguments = Record<string, unknown>> {
  type: "tool_call";
  id: string;
  name: string;
  arguments: TArguments;
}

export interface IAiThinkingPart {
  type: "thinking";
  text: string;
  signature?: string;
  redacted?: boolean;
}

export interface IAiToolResultPart {
  type: "tool_result";
  toolCallId: string;
  content: AiMessageContent;
}

export type AiContentPart =
  | IAiTextPart
  | IAiImagePart
  | IAiFilePart
  | IAiToolCallPart
  | IAiToolResultPart
  | IAiThinkingPart;

export type AiMessageContent = string | AiContentPart[];

export function isAiContentPartType(
  value: unknown,
): value is AiContentPartType {
  return (
    value === "text" ||
    value === "image" ||
    value === "tool_call" ||
    value === "tool_result" ||
    value === "thinking" ||
    value === "file"
  );
}

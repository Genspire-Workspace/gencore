// file: packages\ai\src\common\ai-content-part.ts

export interface IAiTextPart {
  type: "text";
  text: string;
}

export interface IAiImagePart {
  type: "image";
  data: string;
  mimeType: string;
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
  | IAiToolCallPart
  | IAiToolResultPart
  | IAiThinkingPart;

export type AiMessageContent = string | AiContentPart[];

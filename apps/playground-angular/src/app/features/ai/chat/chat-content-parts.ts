// file: apps\playground-angular\src\app\features\ai\chat\chat-content-parts.ts

import type {
  AiContentPart,
  AiMessageContent,
  IAiFilePart,
  IAiImagePart,
  IAiTextPart,
  IAiThinkingPart,
  IAiToolCallPart,
  IAiToolResultPart,
} from '@genspire/ai/domain/messages';

export type UiChatContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string; redacted?: boolean }
  | { kind: 'tool_call'; id: string; name: string; arguments: Record<string, unknown> }
  | { kind: 'tool_result'; toolCallId: string; content: AiMessageContent }
  | { kind: 'image'; data: IAiImagePart['data']; mediaType: string }
  | { kind: 'file'; data: IAiFilePart['data']; mediaType: string; filename?: string };

export function toUiChatContentParts(content: AiMessageContent): UiChatContentPart[] {
  if (typeof content === 'string') {
    return content ? [{ kind: 'text', text: content }] : [];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .map((part: AiContentPart): UiChatContentPart | null => {
      switch (part.type) {
        case 'text': {
          const text = (part as IAiTextPart).text;
          return text ? { kind: 'text', text } : null;
        }
        case 'thinking': {
          const thinking = part as IAiThinkingPart;
          return { kind: 'thinking', text: thinking.text, redacted: thinking.redacted };
        }
        case 'tool_call': {
          const call = part as IAiToolCallPart;
          return { kind: 'tool_call', id: call.id, name: call.name, arguments: call.arguments };
        }
        case 'tool_result': {
          const result = part as IAiToolResultPart;
          return { kind: 'tool_result', toolCallId: result.toolCallId, content: result.content };
        }
        case 'image': {
          const image = part as IAiImagePart;
          return { kind: 'image', data: image.data, mediaType: image.mediaType };
        }
        case 'file': {
          const file = part as IAiFilePart;
          return { kind: 'file', data: file.data, mediaType: file.mediaType, filename: file.filename };
        }
        default:
          return null;
      }
    })
    .filter((part): part is UiChatContentPart => part !== null);
}

export function summarizeToolCallArguments(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

export function isUrlData(data: unknown): data is URL | string {
  return typeof data === 'string' || data instanceof URL;
}
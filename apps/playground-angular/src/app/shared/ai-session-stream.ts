import type { IAiSessionStreamChunk } from './api-types';

export interface IAiSessionStreamAssembly {
  assistantText: string;
  finalContent: unknown | null;
  finished: boolean;
  error: string | null;
}

export function createAiSessionStreamAssembly(): IAiSessionStreamAssembly {
  return {
    assistantText: '',
    finalContent: null,
    finished: false,
    error: null,
  };
}

export function readAiContentText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          'text' in part &&
          (part as { type?: unknown }).type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }

        return '';
      })
      .join('');
  }

  if (content === null || content === undefined) {
    return '';
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

export function applyAiSessionStreamChunk(
  current: IAiSessionStreamAssembly,
  chunk: IAiSessionStreamChunk,
): IAiSessionStreamAssembly {
  const next: IAiSessionStreamAssembly = {
    ...current,
  };

  if (chunk.type === 'text_delta' && typeof chunk.delta === 'string') {
    next.assistantText += chunk.delta;
  }

  if (chunk.message?.role === 'assistant') {
    next.finalContent = chunk.message.content;
  }

  if (chunk.type === 'finish') {
    next.finished = true;
  }

  if (chunk.type === 'error' && typeof chunk.error === 'string') {
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

export function readNdjsonLines(buffer: string): {
  lines: string[];
  remainder: string;
} {
  const parts = buffer.split('\n');
  const remainder = parts.pop() ?? '';

  return {
    lines: parts
      .map((line) => line.trim())
      .filter(Boolean),
    remainder,
  };
}

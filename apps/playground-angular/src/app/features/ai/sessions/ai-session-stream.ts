// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-stream.ts

import type { IAiSessionStreamChunk } from './ai-session-types';
import { readAiContentText } from '../shared/ai-content';

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

export function applyAiSessionStreamChunk(
  current: IAiSessionStreamAssembly,
  chunk: IAiSessionStreamChunk,
): IAiSessionStreamAssembly {
  const next: IAiSessionStreamAssembly = {
    ...current,
  };

  if (chunk.type === 'delta' && typeof chunk.delta === 'string') {
    next.assistantText += chunk.delta;
  }

  if (chunk.message?.role === 'assistant') {
    next.finalContent = chunk.message.content;
  }

  if (chunk.type === 'completed') {
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

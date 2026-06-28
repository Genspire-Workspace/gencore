// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-stream.spec.ts

import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  resolveAiSessionAssistantText,
} from './ai-session-stream';
import { readSseEventData } from '../shared/ai-sse';

describe('ai session stream helpers', () => {
  it('assembles assistant text from deltas and final message content', () => {
    let state = createAiSessionStreamAssembly();

    state = applyAiSessionStreamChunk(state, {
      type: 'delta',
      delta: 'Mad',
    });
    state = applyAiSessionStreamChunk(state, {
      type: 'delta',
      delta: 'rid',
    });
    state = applyAiSessionStreamChunk(state, {
      type: 'message',
      message: {
        role: 'assistant',
        content: 'Madrid',
      },
    });
    state = applyAiSessionStreamChunk(state, {
      type: 'completed',
    });

    expect(state.finished).toBe(true);
    expect(resolveAiSessionAssistantText(state)).toBe('Madrid');
  });

  it('splits buffered sse events while preserving the trailing remainder', () => {
    const extracted = readSseEventData(
      'event: delta\ndata: {"a":1}\n\nevent: message\ndata: {"b":2}\n\ndata: {"c":',
    );

    expect(extracted.events).toEqual(['{"a":1}', '{"b":2}']);
    expect(extracted.remainder).toBe('data: {"c":');
  });
});

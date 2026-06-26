import {
  applyAiSessionStreamChunk,
  createAiSessionStreamAssembly,
  readNdjsonLines,
  resolveAiSessionAssistantText,
} from './ai-session-stream';

describe('ai session stream helpers', () => {
  it('assembles assistant text from deltas and final message content', () => {
    let state = createAiSessionStreamAssembly();

    state = applyAiSessionStreamChunk(state, {
      type: 'text_delta',
      delta: 'Mad',
    });
    state = applyAiSessionStreamChunk(state, {
      type: 'text_delta',
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
      type: 'finish',
    });

    expect(state.finished).toBe(true);
    expect(resolveAiSessionAssistantText(state)).toBe('Madrid');
  });

  it('splits buffered ndjson while preserving the trailing remainder', () => {
    const extracted = readNdjsonLines('{"a":1}\n{"b":2}\n{"c":');

    expect(extracted.lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(extracted.remainder).toBe('{"c":');
  });
});

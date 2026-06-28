// file: apps\playground-angular\src\app\features\ai\shared\ai-sse-client.ts

import { readSseEventData } from './ai-sse';

export async function streamSseJson<TChunk>(
  input: {
    url: string;
    accessToken: string;
    body: unknown;
  },
  onChunk: (chunk: TChunk) => void,
): Promise<void> {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify(input.body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Stream request failed with HTTP ${response.status}: ${errorBody}`,
    );
  }

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const extracted = readSseEventData(buffer);
      buffer = extracted.remainder;

      for (const eventData of extracted.events) {
        onChunk(JSON.parse(eventData) as TChunk);
      }
    }

    buffer += decoder.decode();
    const trailing = readSseEventData(buffer);
    for (const eventData of trailing.events) {
      onChunk(JSON.parse(eventData) as TChunk);
    }
  } finally {
    reader.releaseLock();
  }
}

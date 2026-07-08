import { readSseEventData } from "./read-sse-event-data.js";
type FetchHeaders = Headers | Record<string, string>;

export async function streamSseJson<TChunk>(
  input: {
    url: string;
    accessToken?: string | null;
    body: unknown;
    headers?: FetchHeaders;
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
  },
  onChunk: (chunk: TChunk) => void,
): Promise<void> {
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
  const headers = new Headers(input.headers);
  headers.set("accept", "text/event-stream");
  headers.set("content-type", "application/json");
  if (input.accessToken) {
    headers.set("authorization", `Bearer ${input.accessToken}`);
  }

  const response = await fetchImpl(input.url, {
    method: "POST",
    headers,
    body: JSON.stringify(input.body),
    signal: input.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Stream request failed with HTTP ${response.status}: ${errorBody}`,
    );
  }

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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

export interface IVerifyHttpJsonResponse {
  status: number;
  headers: Headers;
  body: unknown;
}

export function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (init?.signal) {
    init.signal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<IVerifyHttpJsonResponse> {
  const response = await fetchWithTimeout(url, init, timeoutMs);
  const body = await response.json().catch(async () => {
    const text = await response.text().catch(() => "");
    return text;
  });

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

export async function postJson(
  url: string,
  payload: unknown,
  timeoutMs?: number,
): Promise<IVerifyHttpJsonResponse> {
  return fetchJson(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  }, timeoutMs);
}

export async function readNdjsonOrJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-ndjson")) {
    const text = await response.text();

    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  return response.json();
}

export async function* streamNdjsonOrJson(
  response: Response,
): AsyncGenerator<unknown, void, void> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-ndjson")) {
    yield await response.json().catch(async () => {
      return await response.text().catch(() => "");
    });
    return;
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

      while (true) {
        const newlineIndex = buffer.indexOf("\n");

        if (newlineIndex < 0) {
          break;
        }

        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) {
          continue;
        }

        yield JSON.parse(line);
      }
    }

    buffer += decoder.decode();
    const trailing = buffer.trim();

    if (trailing) {
      yield JSON.parse(trailing);
    }
  } finally {
    reader.releaseLock();
  }
}

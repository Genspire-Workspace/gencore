type FetchHeaders = Headers | Record<string, string>;

export interface IFetchAiHttpTransportOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetch?: typeof globalThis.fetch;
  headers?: FetchHeaders;
}

export interface IFetchAiRequestInit {
  method?: string;
  body?: unknown;
  headers?: FetchHeaders;
  signal?: AbortSignal;
}

export class FetchAiHttpTransport {
  readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: IFetchAiHttpTransportOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async get<TResponse>(path: string): Promise<TResponse> {
    return await this.request<TResponse>(path);
  }

  async post<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return await this.request<TResponse>(path, {
      method: "POST",
      body,
    });
  }

  async patch<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return await this.request<TResponse>(path, {
      method: "PATCH",
      body,
    });
  }

  async delete<TResponse>(path: string): Promise<TResponse> {
    return await this.request<TResponse>(path, {
      method: "DELETE",
    });
  }

  async getNullable<TResponse>(path: string): Promise<TResponse | null> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: "GET",
      headers: await this.buildHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    return await this.readJsonOrThrow<TResponse>(response);
  }

  async postSse<TChunk>(
    path: string,
    body: unknown,
    onChunk: (chunk: TChunk) => void,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<void> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: "POST",
      headers: await this.buildHeaders(true, {
        accept: "text/event-stream",
      }),
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    await this.readSseResponse(response, onChunk);
  }

  resolveUrl(path: string): string {
    return `${this.options.baseUrl}${path}`;
  }

  private async request<TResponse>(
    path: string,
    init?: IFetchAiRequestInit,
  ): Promise<TResponse> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: init?.method ?? "GET",
      headers: await this.buildHeaders(init?.body !== undefined, init?.headers),
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
    });

    return await this.readJsonOrThrow<TResponse>(response);
  }

  private async readJsonOrThrow<TResponse>(response: Response): Promise<TResponse> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Request failed with HTTP ${response.status}: ${errorBody}`,
      );
    }

    return (await response.json()) as TResponse;
  }

  private async readSseResponse<TChunk>(
    response: Response,
    onChunk: (chunk: TChunk) => void,
  ): Promise<void> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Stream request failed with HTTP ${response.status}: ${errorBody}`,
      );
    }

    if (!response.body) {
      return;
    }

    const { readSseEventData } = await import("../sse/read-sse-event-data.js");
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

  private async buildHeaders(
    includeJson = false,
    overrideHeaders?: FetchHeaders,
  ): Promise<Headers> {
    const headers = new Headers(this.options.headers);
    const extraHeaders = new Headers(overrideHeaders);
    headers.set("accept", "application/json");
    if (includeJson) {
      headers.set("content-type", "application/json");
    }

    for (const [key, value] of extraHeaders.entries()) {
      headers.set(key, value);
    }

    const accessToken = await this.resolveAccessToken();
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  private async resolveAccessToken(): Promise<string | null> {
    const getAccessToken = this.options.getAccessToken;
    if (!getAccessToken) {
      return null;
    }

    return await getAccessToken();
  }
}

type FetchHeaders = Headers | Record<string, string>;

export interface IFetchAuthHttpTransportOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetch?: typeof globalThis.fetch;
  headers?: FetchHeaders;
}

export interface IFetchAuthRequestInit {
  method?: string;
  body?: unknown;
  headers?: FetchHeaders;
  signal?: AbortSignal;
}

export class FetchAuthHttpTransport {
  readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: IFetchAuthHttpTransportOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async post<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return await this.request<TResponse>(path, {
      method: "POST",
      body,
    });
  }

  resolveUrl(path: string): string {
    return `${this.options.baseUrl}${path}`;
  }

  private async request<TResponse>(
    path: string,
    init?: IFetchAuthRequestInit,
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

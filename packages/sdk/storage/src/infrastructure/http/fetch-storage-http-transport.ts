type FetchHeaders = Headers | Record<string, string>;

export interface IFetchStorageHttpTransportOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetch?: typeof globalThis.fetch;
  headers?: FetchHeaders;
}

export class FetchStorageHttpTransport {
  readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: IFetchStorageHttpTransportOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async get<TResponse>(path: string): Promise<TResponse> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: "GET",
      headers: await this.buildHeaders(),
    });

    return await this.readJsonOrThrow<TResponse>(response);
  }

  async postFormData<TResponse>(
    path: string,
    body: FormData,
  ): Promise<TResponse> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      method: "POST",
      headers: await this.buildHeaders(false),
      body,
    });

    return await this.readJsonOrThrow<TResponse>(response);
  }

  resolveUrl(path: string): string {
    return `${this.options.baseUrl}${path}`;
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

  private async buildHeaders(includeJson = true): Promise<Headers> {
    const headers = new Headers(this.options.headers);
    headers.set("accept", "application/json");
    if (includeJson) {
      headers.set("content-type", "application/json");
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

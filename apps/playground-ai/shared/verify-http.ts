// file: apps\playground-ai\shared\verify-http.ts

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
  init?: RequestInit,
  timeoutMs?: number,
): Promise<IVerifyHttpJsonResponse> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");

  return fetchJson(url, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }, timeoutMs);
}

export interface IVerifyAuthAccount {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  email: string;
  password: string;
}

export function readSeededAdminEnv(): {
  email: string;
  password: string;
} {
  const email = process.env.GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL?.trim();
  const password = process.env.GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD?.trim();

  if (!email) {
    throw new Error(
      "GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL is required for AI session verification.",
    );
  }

  if (!password) {
    throw new Error(
      "GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD is required for AI session verification.",
    );
  }

  return { email, password };
}

export async function loginAccount(
  baseUrl: string,
  email: string,
  password: string,
  timeoutMs?: number,
): Promise<IVerifyAuthAccount> {
  const response = await postJson(
    `${normalizeBaseUrl(baseUrl)}/login`,
    { email, password },
    undefined,
    timeoutMs,
  );

  if (response.status !== 200) {
    throw new Error(
      `Login failed for '${email}': HTTP ${response.status} - ${JSON.stringify(response.body)}`,
    );
  }

  const body = response.body as {
    accessToken: string;
    refreshToken?: string;
    user?: { id: string };
  };

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user?.id,
    email,
    password,
  };
}

export async function loginSeededAdmin(
  baseUrl: string,
  timeoutMs?: number,
): Promise<IVerifyAuthAccount> {
  const { email, password } = readSeededAdminEnv();
  return loginAccount(baseUrl, email, password, timeoutMs);
}

export async function registerAccount(
  baseUrl: string,
  email = `verify-${crypto.randomUUID()}@example.com`,
  password = "password123",
  timeoutMs?: number,
): Promise<IVerifyAuthAccount> {
  const response = await postJson(
    `${normalizeBaseUrl(baseUrl)}/register`,
    { email, password },
    undefined,
    timeoutMs,
  );

  if (response.status !== 201) {
    throw new Error(
      `Register failed for '${email}': HTTP ${response.status} - ${JSON.stringify(response.body)}`,
    );
  }

  const body = response.body as {
    accessToken: string;
    refreshToken?: string;
    user: { id: string };
  };

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
    email,
    password,
  };
}

export function authHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
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

  const text = await response.text().catch(() => "");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    yield JSON.parse(trimmed);
  }
}

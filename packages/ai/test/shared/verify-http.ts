export interface IVerifyHttpJsonResponse {
  status: number;
  headers: Headers;
  body: unknown;
}

export function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<IVerifyHttpJsonResponse> {
  const response = await fetch(url, init);
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
): Promise<IVerifyHttpJsonResponse> {
  return fetchJson(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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

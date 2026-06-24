import type { ProblemDetails } from "./problem-details.js";

export interface ProblemDetailsOptions extends Partial<ProblemDetails> {
  extensions?: Record<string, unknown>;
}

function toHeaderRecord(headers?: NonNullable<ResponseInit["headers"]>): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    record[key] = value;
  }
  return record;
}

export function json<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, init);
}

export function text(body: string, init?: ResponseInit): Response {
  const headers = toHeaderRecord(init?.headers);

  return new Response(body, {
    ...init,
    headers: {
      ...headers,
      "content-type": headers["content-type"] ?? "text/plain; charset=utf-8",
    },
  });
}

export function noContent(init?: ResponseInit): Response {
  return new Response(null, {
    ...init,
    status: init?.status ?? 204,
  });
}

export function redirect(location: string | URL, status = 302): Response {
  return Response.redirect(String(location), status);
}

export function problem(options: ProblemDetailsOptions = {}): Response {
  const status = options.status ?? 500;
  const body = {
    type: options.type ?? "about:blank",
    title: options.title ?? "Internal Server Error",
    status,
    ...(options.detail ? { detail: options.detail } : {}),
    ...(options.instance ? { instance: options.instance } : {}),
    ...(options.code ? { code: options.code } : {}),
    ...(options.errors ? { errors: options.errors } : {}),
    ...(options.extensions ?? {}),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/problem+json; charset=utf-8",
    },
  });
}

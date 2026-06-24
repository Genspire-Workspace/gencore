// file: packages\server\src\responses\response-normalizer.ts

import { json, noContent, text } from "./response-helpers.js";

export type ResponseLike = Response | string | object | null | undefined;

export function toResponse(value: ResponseLike): Response {
  if (value instanceof Response) {
    return value;
  }

  if (typeof value === "string") {
    return text(value);
  }

  if (value == null) {
    return noContent();
  }

  return json(value);
}

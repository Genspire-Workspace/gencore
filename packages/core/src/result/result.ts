import { GenError } from "./gen-error.js";

export type Result<T, E = GenError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E = GenError>(error: E): Result<never, E> {
  return { ok: false, error };
}

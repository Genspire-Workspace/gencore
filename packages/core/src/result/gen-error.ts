// file: packages\core\src\result\gen-error.ts

export class GenError extends Error {
  constructor(
    message: string,
    public readonly code = "GENCORE_ERROR",
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GenError";
  }
}

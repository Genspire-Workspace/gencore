// file: packages\server\src\responses\http-error.ts

export interface HttpErrorOptions {
  code?: string;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, options: HttpErrorOptions = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.statusCode = status;
    this.code = options.code;
    this.detail = options.detail;
    this.instance = options.instance;
    this.errors = options.errors;
  }
}

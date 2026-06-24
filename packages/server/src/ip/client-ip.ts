// file: packages\server\src\ip\client-ip.ts

export interface IClientIpOptions {
  trustProxy?: boolean;
  headers?: readonly string[];
}

export interface IResolvedClientIp {
  ipAddress: string | null;
  source: "bun" | "x-forwarded-for" | "x-real-ip" | "cf-connecting-ip" | "forwarded" | "unknown";
}

const DEFAULT_TRUSTED_HEADERS: readonly string[] = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "forwarded",
];

function parseForwardedFor(value: string): string | null {
  const parts = value.split(",");
  for (const part of parts) {
    const ip = part.trim();
    if (ip) {
      return stripBrackets(ip);
    }
  }
  return null;
}

function parseForwarded(value: string): string | null {
  const match = value.match(/for\s*=\s*(?:\[)?([^\];,\s]+)(?:\])?/i);
  if (match && match[1]) {
    return stripQuotes(stripBrackets(match[1].trim()));
  }
  return null;
}

function stripBrackets(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }
  return value;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function resolveClientIp(
  req: Request,
  options?: IClientIpOptions,
): IResolvedClientIp {
  const trustProxy = options?.trustProxy ?? false;
  const headers = options?.headers ?? DEFAULT_TRUSTED_HEADERS;

  if (!trustProxy) {
    return { ipAddress: null, source: "unknown" };
  }

  for (const headerName of headers) {
    const value = req.headers.get(headerName);
    if (!value) {
      continue;
    }

    switch (headerName) {
      case "cf-connecting-ip": {
        const ip = value.trim();
        if (ip) {
          return { ipAddress: ip, source: "cf-connecting-ip" };
        }
        break;
      }
      case "x-real-ip": {
        const ip = value.trim();
        if (ip) {
          return { ipAddress: ip, source: "x-real-ip" };
        }
        break;
      }
      case "x-forwarded-for": {
        const ip = parseForwardedFor(value);
        if (ip) {
          return { ipAddress: ip, source: "x-forwarded-for" };
        }
        break;
      }
      case "forwarded": {
        const ip = parseForwarded(value);
        if (ip) {
          return { ipAddress: ip, source: "forwarded" };
        }
        break;
      }
    }
  }

  return { ipAddress: null, source: "unknown" };
}

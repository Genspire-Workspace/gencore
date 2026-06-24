// file: packages\core\src\ids\guid.ts

import { createHash, randomUUID } from "node:crypto";

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function createGuid(): string {
  return randomUUID();
}

export function deterministicGuid(value: string, namespace = "genspire"): string {
  const hash = createHash("sha1")
    .update(namespace, "utf8")
    .update("\0", "utf8")
    .update(value, "utf8")
    .digest();

  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export function deterministicGuidFromParts(
  parts: readonly (string | number | boolean)[],
  namespace = "genspire",
): string {
  return deterministicGuid(parts.map((part) => String(part).trim()).join("::"), namespace);
}

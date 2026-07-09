// file: packages\core\src\ids\guid.ts

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

function readWebCrypto(): Crypto | null {
  const candidate = (globalThis as { crypto?: Crypto }).crypto;
  return candidate ?? null;
}

function fallbackRandomUuid(): string {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function hashToBytes(value: string): Uint8Array {
  let a = 0x9e3779b9;
  let b = 0x243f6a88;
  let c = 0xb7e15162;
  let d = 0xdeadbeef;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    a = Math.imul(a ^ code, 597399067);
    b = Math.imul(b ^ code, 2869860233);
    c = Math.imul(c ^ code, 951274213);
    d = Math.imul(d ^ code, 2716044179);
  }

  a = Math.imul(a ^ (a >>> 15), 2246822507) ^ Math.imul(d ^ (d >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 15), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 15), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 15), 2246822507) ^ Math.imul(c ^ (c >>> 13), 3266489909);

  const seeds = [a, b, c, d];
  const bytes = new Uint8Array(16);
  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const seed = (seeds[seedIndex] ?? 0) >>> 0;
    const offset = seedIndex * 4;
    bytes[offset] = seed & 0xff;
    bytes[offset + 1] = (seed >>> 8) & 0xff;
    bytes[offset + 2] = (seed >>> 16) & 0xff;
    bytes[offset + 3] = (seed >>> 24) & 0xff;
  }

  return bytes;
}

export function createGuid(): string {
  const crypto = readWebCrypto();
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return fallbackRandomUuid();
}

export function deterministicGuid(value: string, namespace = "genspire"): string {
  const bytes = hashToBytes(`${namespace}\0${value}`);
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

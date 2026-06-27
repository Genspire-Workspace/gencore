// file: apps/playground-app-ai/src/verify/shared/images.ts

import { deflateSync } from "node:zlib";
import path from "node:path";
import type { IAiImagePart } from "../../../../../packages/ai/src/domain/messages/ai-content-part.js";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let current = n;

    for (let bit = 0; bit < 8; bit += 1) {
      current =
        (current & 1) === 1
          ? 0xedb88320 ^ (current >>> 1)
          : current >>> 1;
    }

    table[n] = current >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer): number {
  let current = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    current = CRC_TABLE[(current ^ buffer[i]!) & 0xff]! ^ (current >>> 8);
  }

  return (current ^ 0xffffffff) >>> 0;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = u32(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([u32(data.length), typeBuffer, data, crc]);
}

export function createSolidColorPngBase64(
  width: number,
  height: number,
  rgb: [number, number, number],
): string {
  const [r, g, b] = rgb;
  const pixel = Buffer.from([r, g, b]);
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: width }, () => Buffer.from(pixel))),
  ]);
  const raw = Buffer.concat(
    Array.from({ length: height }, () => Buffer.from(row)),
  );

  const ihdr = pngChunk(
    "IHDR",
    Buffer.concat([
      u32(width),
      u32(height),
      Buffer.from([8, 2, 0, 0, 0]),
    ]),
  );
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([PNG_SIGNATURE, ihdr, idat, iend]).toString("base64");
}

export function createImagePartFromBase64(
  base64: string,
  mediaType = "image/png",
): IAiImagePart {
  return { type: "image", data: base64, mediaType };
}

export function createDefaultImagePart(): IAiImagePart {
  return createImagePartFromBase64(
    createSolidColorPngBase64(32, 32, [255, 0, 0]),
  );
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function createLocalImagePart(
  filePath: string,
): Promise<IAiImagePart> {
  const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
  const extension = path.extname(filePath).toLowerCase();
  const mediaType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";

  return { type: "image", data: buffer.toString("base64"), mediaType };
}
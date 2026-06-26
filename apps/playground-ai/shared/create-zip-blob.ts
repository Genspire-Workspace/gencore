export interface ICreateZipBlobOptions {
  files: Record<string, string>;
  name?: string;
}

export async function createZipBlob(
  options: ICreateZipBlobOptions,
): Promise<{ blob: Blob; name: string }> {
  const crcTable = (() => {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index += 1) {
      let current = index;

      for (let bit = 0; bit < 8; bit += 1) {
        current = (current & 1) === 1
          ? 0xedb88320 ^ (current >>> 1)
          : current >>> 1;
      }

      table[index] = current >>> 0;
    }

    return table;
  })();
  const encoder = new TextEncoder();

  function crc32(bytes: Uint8Array): number {
    let current = 0xffffffff;

    for (const value of bytes) {
      current = crcTable[(current ^ value) & 0xff]! ^ (current >>> 8);
    }

    return (current ^ 0xffffffff) >>> 0;
  }

  function writeUInt16(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  }

  function writeUInt32(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  }

  interface IZipEntry {
    name: Uint8Array;
    body: Uint8Array;
    crc: number;
    localHeaderOffset: number;
  }

  const entries: IZipEntry[] = [];
  const localParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, content] of Object.entries(options.files)) {
    const nameBytes = encoder.encode(name.replaceAll("\\", "/"));
    const bodyBytes = encoder.encode(content);
    const header = new Uint8Array(30 + nameBytes.length);
    const crc = crc32(bodyBytes);

    writeUInt32(header, 0, 0x04034b50);
    writeUInt16(header, 4, 20);
    writeUInt16(header, 6, 0);
    writeUInt16(header, 8, 0);
    writeUInt16(header, 10, 0);
    writeUInt16(header, 12, 0);
    writeUInt32(header, 14, crc);
    writeUInt32(header, 18, bodyBytes.length);
    writeUInt32(header, 22, bodyBytes.length);
    writeUInt16(header, 26, nameBytes.length);
    writeUInt16(header, 28, 0);
    header.set(nameBytes, 30);

    entries.push({
      name: nameBytes,
      body: bodyBytes,
      crc,
      localHeaderOffset: localOffset,
    });
    localParts.push(header, bodyBytes);
    localOffset += header.length + bodyBytes.length;
  }

  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (const entry of entries) {
    const header = new Uint8Array(46 + entry.name.length);

    writeUInt32(header, 0, 0x02014b50);
    writeUInt16(header, 4, 20);
    writeUInt16(header, 6, 20);
    writeUInt16(header, 8, 0);
    writeUInt16(header, 10, 0);
    writeUInt16(header, 12, 0);
    writeUInt16(header, 14, 0);
    writeUInt32(header, 16, entry.crc);
    writeUInt32(header, 20, entry.body.length);
    writeUInt32(header, 24, entry.body.length);
    writeUInt16(header, 28, entry.name.length);
    writeUInt16(header, 30, 0);
    writeUInt16(header, 32, 0);
    writeUInt16(header, 34, 0);
    writeUInt16(header, 36, 0);
    writeUInt32(header, 38, 0);
    writeUInt32(header, 42, entry.localHeaderOffset);
    header.set(entry.name, 46);

    centralParts.push(header);
    centralSize += header.length;
  }

  const endRecord = new Uint8Array(22);
  writeUInt32(endRecord, 0, 0x06054b50);
  writeUInt16(endRecord, 4, 0);
  writeUInt16(endRecord, 6, 0);
  writeUInt16(endRecord, 8, entries.length);
  writeUInt16(endRecord, 10, entries.length);
  writeUInt32(endRecord, 12, centralSize);
  writeUInt32(endRecord, 16, localOffset);
  writeUInt16(endRecord, 20, 0);

  return {
    blob: new Blob([...localParts, ...centralParts, endRecord], {
      type: "application/zip",
    }),
    name: options.name ?? "bundle.zip",
  };
}

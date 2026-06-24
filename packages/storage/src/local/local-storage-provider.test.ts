// file: packages\storage\src\local\local-storage-provider.test.ts

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LocalStorageProvider, localStorageProvider } from "./local-storage-provider.js";
import type { IStorageProvider } from "../contracts/storage-provider.js";

let tempDir: string;
let provider: IStorageProvider;

beforeAll(() => {
  tempDir = mkdtempSync(join(import.meta.dir, "storage-test-"));
});

afterAll(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function createProvider(): LocalStorageProvider {
  return localStorageProvider({ rootDirectory: tempDir });
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

describe("LocalStorageProvider", () => {
  test("putObject() writes bytes and metadata", async () => {
    provider = createProvider();
    const result = await provider.putObject({
      bucket: "avatars",
      key: "users/123/avatar.png",
      body: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/png",
      metadata: { uploadedBy: "user_1" },
    });

    expect(result.bucket).toBe("avatars");
    expect(result.key).toBe("users/123/avatar.png");
    expect(result.size).toBe(4);
    expect(result.contentType).toBe("image/png");
    expect(result.metadata).toEqual({ uploadedBy: "user_1" });
    expect(result.etag).toBeString();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

    const filePath = join(tempDir, "avatars", "users", "123", "avatar.png");
    const metaPath = filePath + ".meta.json";
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(metaPath)).toBe(true);

    const metaFile = Bun.file(metaPath);
    const meta = await metaFile.json();
    expect(meta.bucket).toBe("avatars");
    expect(meta.key).toBe("users/123/avatar.png");
    expect(meta.size).toBe(4);
    expect(meta.contentType).toBe("image/png");
    expect(meta.etag).toBeString();
  });

  test("getObject() reads bytes and metadata", async () => {
    provider = createProvider();
    await provider.putObject({
      bucket: "docs",
      key: "readme.txt",
      body: "Hello World",
      contentType: "text/plain",
    });

    const result = await provider.getObject({ bucket: "docs", key: "readme.txt" });
    expect(result).not.toBeNull();

    const bytes = await readStream(result!.body);
    expect(new TextDecoder().decode(bytes)).toBe("Hello World");
    expect(result!.bucket).toBe("docs");
    expect(result!.key).toBe("readme.txt");
    expect(result!.size).toBe(11);
    expect(result!.contentType).toBe("text/plain");
    expect(result!.etag).toBeString();
  });

  test("getObject() returns null for missing object", async () => {
    provider = createProvider();
    const result = await provider.getObject({ bucket: "nonexistent", key: "file.txt" });
    expect(result).toBeNull();
  });

  test("exists() returns true after put", async () => {
    provider = createProvider();
    expect(await provider.exists({ bucket: "stuff", key: "a.txt" })).toBe(false);

    await provider.putObject({
      bucket: "stuff",
      key: "a.txt",
      body: "data",
    });

    expect(await provider.exists({ bucket: "stuff", key: "a.txt" })).toBe(true);
  });

  test("deleteObject() removes file and metadata", async () => {
    provider = createProvider();
    await provider.putObject({
      bucket: "tmp",
      key: "remove-me.txt",
      body: "bye",
    });

    const filePath = join(tempDir, "tmp", "remove-me.txt");
    const metaPath = filePath + ".meta.json";
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(metaPath)).toBe(true);

    const deleted = await provider.deleteObject({ bucket: "tmp", key: "remove-me.txt" });
    expect(deleted).toBe(true);
    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(metaPath)).toBe(false);
  });

  test("deleteObject() returns false for missing object", async () => {
    provider = createProvider();
    const result = await provider.deleteObject({ bucket: "nope", key: "ghost.txt" });
    expect(result).toBe(false);
  });

  test("listObjects() lists stored objects", async () => {
    provider = createProvider();
    await provider.putObject({ bucket: "list-test", key: "a.txt", body: "A" });
    await provider.putObject({ bucket: "list-test", key: "b.txt", body: "BB" });
    await provider.putObject({ bucket: "list-test", key: "c.txt", body: "CCC" });

    const result = await provider.listObjects({ bucket: "list-test" });
    expect(result.items.length).toBe(3);
    expect(result.items.map((i) => i.key)).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(result.hasMore).toBe(false);
  });

  test("listObjects() respects prefix", async () => {
    provider = createProvider();
    await provider.putObject({ bucket: "prefix-test", key: "images/a.png", body: "A" });
    await provider.putObject({ bucket: "prefix-test", key: "images/b.png", body: "B" });
    await provider.putObject({ bucket: "prefix-test", key: "videos/c.mp4", body: "C" });

    const result = await provider.listObjects({ bucket: "prefix-test", prefix: "images/" });
    expect(result.items.length).toBe(2);
    expect(result.items.map((i) => i.key)).toEqual(["images/a.png", "images/b.png"]);
  });

  test("listObjects() ignores .meta.json files", async () => {
    provider = createProvider();
    await provider.putObject({ bucket: "meta-test", key: "data.txt", body: "x" });

    const result = await provider.listObjects({ bucket: "meta-test" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.key).toBe("data.txt");
  });

  test("listObjects() supports limit and cursor", async () => {
    provider = createProvider();
    await provider.putObject({ bucket: "page-test", key: "01.txt", body: "1" });
    await provider.putObject({ bucket: "page-test", key: "02.txt", body: "2" });
    await provider.putObject({ bucket: "page-test", key: "03.txt", body: "3" });

    const page1 = await provider.listObjects({ bucket: "page-test", limit: 2 });
    expect(page1.items.length).toBe(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.cursor).toBe("02.txt");

    const page2 = await provider.listObjects({ bucket: "page-test", limit: 2, cursor: page1.cursor });
    expect(page2.items.length).toBe(1);
    expect(page2.hasMore).toBe(false);
    expect(page2.items[0]!.key).toBe("03.txt");
  });

  describe("path traversal protection", () => {
    test('rejects key with ".."', async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "../secret.txt", body: "x" }),
      ).rejects.toThrow("..");
    });

    test('rejects key with "..\\.." backslashes', async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "..\\secret.txt", body: "x" }),
      ).rejects.toThrow("..");
    });

    test("rejects absolute key", async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "/etc/passwd", body: "x" }),
      ).rejects.toThrow("absolute");
    });

    test("rejects Windows drive path key", async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "C:\\Windows\\secret.txt", body: "x" }),
      ).rejects.toThrow();
    });

    test("rejects empty bucket", async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "", key: "file.txt", body: "x" }),
      ).rejects.toThrow("Bucket must not be empty");
    });

    test("rejects empty key", async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "", body: "x" }),
      ).rejects.toThrow("Key must not be empty");
    });

    test("rejects key with null byte", async () => {
      provider = createProvider();
      await expect(
        provider.putObject({ bucket: "test", key: "file\0.txt", body: "x" }),
      ).rejects.toThrow("null bytes");
    });
  });

  test("etag is stable for same content", async () => {
    provider = createProvider();
    const body = new Uint8Array([10, 20, 30, 40]);

    const r1 = await provider.putObject({ bucket: "etags", key: "v1.bin", body });
    const r2 = await provider.putObject({ bucket: "etags", key: "v2.bin", body });

    expect(r1.etag).toBe(r2.etag);
  });

  test("different content produces different etags", async () => {
    provider = createProvider();
    const r1 = await provider.putObject({ bucket: "etags2", key: "a.bin", body: new Uint8Array([1]) });
    const r2 = await provider.putObject({ bucket: "etags2", key: "b.bin", body: new Uint8Array([2]) });

    expect(r1.etag).not.toBe(r2.etag);
  });

  test("public URL generation works with publicBaseUrl", () => {
    const p = localStorageProvider({
      rootDirectory: tempDir,
      publicBaseUrl: "https://cdn.example.com",
    });

    const url = p.getPublicUrl({ bucket: "avatars", key: "users/123/photo.png" });
    expect(url).toBe("https://cdn.example.com/avatars/users/123/photo.png");
  });

  test("public URL encodes special characters", () => {
    const p = localStorageProvider({
      rootDirectory: tempDir,
      publicBaseUrl: "https://cdn.example.com",
    });

    const url = p.getPublicUrl({ bucket: "files", key: "folder/file name.txt" });
    expect(url).toContain("file%20name.txt");
  });

  test("public URL throws without publicBaseUrl", () => {
    const p = localStorageProvider({ rootDirectory: tempDir });

    expect(() => p.getPublicUrl({ bucket: "x", key: "y.txt" })).toThrow("publicBaseUrl");
  });
});

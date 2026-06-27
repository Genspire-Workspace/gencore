// file: packages/storage/src/infrastructure/providers/local-storage-provider.ts

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, normalize, relative, resolve, sep } from "node:path";
import type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "../../application/contracts/storage-object.js";
import type { IStorageProvider } from "../../application/contracts/storage-provider.js";
import type { ILocalStorageProviderOptions } from "../../application/contracts/storage-options.js";

interface ILocalStoredObjectMetadata {
  bucket: string;
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
  size: number;
  etag: string;
  createdAt: string;
  updatedAt: string;
}

export class LocalStorageProvider implements IStorageProvider {
  private readonly resolvedRoot: string;

  constructor(private readonly options: ILocalStorageProviderOptions) {
    this.resolvedRoot = resolve(this.options.rootDirectory);
  }

  async putObject(input: IPutObjectInput): Promise<IStoredObject> {
    const objectPath = this.resolveObjectPath(input);
    const metaPath = objectPath + ".meta.json";
    const parentDir = dirname(objectPath);

    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    const bytes = await this.bodyToBytes(input.body);
    await Bun.write(objectPath, bytes);

    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    const etag = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now = new Date();

    const metadata: ILocalStoredObjectMetadata = {
      bucket: input.bucket,
      key: input.key,
      contentType: input.contentType,
      metadata: input.metadata,
      size: bytes.byteLength,
      etag,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await Bun.write(metaPath, JSON.stringify(metadata, null, 2));

    return {
      bucket: input.bucket,
      key: input.key,
      size: bytes.byteLength,
      contentType: input.contentType,
      etag,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getObject(ref: IStorageObjectRef): Promise<IGetObjectResult | null> {
    const objectPath = this.resolveObjectPath(ref);
    const metaPath = objectPath + ".meta.json";

    const file = Bun.file(objectPath);
    if (!(await file.exists())) {
      return null;
    }

    let meta: ILocalStoredObjectMetadata | null = null;
    const metaFile = Bun.file(metaPath);
    if (await metaFile.exists()) {
      try {
        meta = await metaFile.json();
      } catch {
        meta = null;
      }
    }

    const stats = statSync(objectPath);

    return {
      bucket: meta?.bucket ?? ref.bucket,
      key: meta?.key ?? ref.key,
      size: meta?.size ?? stats.size,
      contentType: meta?.contentType,
      etag: meta?.etag,
      metadata: meta?.metadata,
      createdAt: meta?.createdAt ? new Date(meta.createdAt) : stats.birthtime,
      updatedAt: meta?.updatedAt ? new Date(meta.updatedAt) : stats.mtime,
      body: file.stream() as ReadableStream<Uint8Array>,
    };
  }

  async deleteObject(ref: IStorageObjectRef): Promise<boolean> {
    const objectPath = this.resolveObjectPath(ref);
    const metaPath = objectPath + ".meta.json";

    const existed = existsSync(objectPath);
    if (!existed) {
      return false;
    }

    unlinkSync(objectPath);

    if (existsSync(metaPath)) {
      unlinkSync(metaPath);
    }

    return true;
  }

  async exists(ref: IStorageObjectRef): Promise<boolean> {
    const objectPath = this.resolveObjectPath(ref);
    return existsSync(objectPath);
  }

  async listObjects(input: IListObjectsInput): Promise<IListObjectsResult> {
    const { bucket, prefix: rawPrefix, limit, cursor } = input;
    const prefix = rawPrefix ?? "";

    const placeholderPath = this.resolveObjectPath({ bucket, key: "__placeholder__" });
    const bucketDir = dirname(placeholderPath);

    if (!existsSync(bucketDir)) {
      return { items: [], hasMore: false };
    }

    const allFiles = this.walkDir(bucketDir);
    const objectFiles = allFiles.filter((f) => !f.endsWith(".meta.json"));

    objectFiles.sort();

    let items: IStoredObject[] = [];

    for (const filePath of objectFiles) {
      const relativePath = relative(bucketDir, filePath).replace(/\\/g, "/");
      if (relativePath.startsWith(".")) {
        continue;
      }

      if (prefix && !relativePath.startsWith(prefix)) {
        continue;
      }

      if (cursor !== undefined && relativePath <= cursor) {
        continue;
      }

      const stats = statSync(filePath);

      let metadata: Record<string, string> | undefined;
      const metaPath = filePath + ".meta.json";
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(
            await Bun.file(metaPath).text(),
          ) as ILocalStoredObjectMetadata;
          metadata = meta.metadata;
        } catch {
          // ignore corrupt metadata
        }
      }

      items.push({
        bucket,
        key: relativePath,
        size: stats.size,
        metadata,
      });

      if (limit !== undefined && items.length >= limit) {
        break;
      }
    }

    const hasMore = limit !== undefined && items.length >= limit;

    if (hasMore && limit !== undefined) {
      items = items.slice(0, limit);
    }

    const lastItem = items.length > 0 ? items[items.length - 1] : undefined;

    return {
      items,
      cursor: lastItem?.key,
      hasMore,
    };
  }

  getPublicUrl(ref: IStorageObjectRef): string {
    if (!this.options.publicBaseUrl) {
      throw new Error(
        "getPublicUrl requires publicBaseUrl to be configured in LocalStorageProvider options.",
      );
    }

    const base = this.options.publicBaseUrl.replace(/\/+$/, "");
    const encodedKey = ref.key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${base}/${encodeURIComponent(ref.bucket)}/${encodedKey}`;
  }

  async createSignedUrl(_input: ICreateSignedUrlInput): Promise<string> {
    throw new Error(
      "Signed URLs are not supported by LocalStorageProvider.",
    );
  }

  private resolveObjectPath(ref: IStorageObjectRef): string {
    const { bucket, key } = ref;

    if (!bucket || bucket.length === 0) {
      throw new Error("Bucket must not be empty");
    }

    if (!key || key.length === 0) {
      throw new Error("Key must not be empty");
    }

    if (bucket.includes("\0") || key.includes("\0")) {
      throw new Error("Bucket and key must not contain null bytes");
    }

    if (bucket.includes("..") || key.includes("..")) {
      throw new Error("Bucket and key must not contain '..' path traversal");
    }

    if (isAbsolute(bucket) || isAbsolute(key)) {
      throw new Error("Bucket and key must not be absolute paths");
    }

    if (/^[a-zA-Z]:/.test(bucket) || /^[a-zA-Z]:/.test(key)) {
      throw new Error("Bucket and key must not be Windows drive paths");
    }

    const normalizedBucket = normalize(bucket).replace(/^\.?[\\/]+/, "");
    const normalizedKey = normalize(key).replace(/^\.?[\\/]+/, "");

    const fullPath = resolve(this.resolvedRoot, normalizedBucket, normalizedKey);

    if (!fullPath.startsWith(this.resolvedRoot + sep)) {
      throw new Error("Path traversal detected: resolved path escapes storage root");
    }

    return fullPath;
  }

  private async bodyToBytes(
    body: Blob | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array> | string,
  ): Promise<Uint8Array> {
    if (typeof body === "string") {
      return new TextEncoder().encode(body);
    }

    if (body instanceof Uint8Array) {
      return body;
    }

    if (body instanceof ArrayBuffer) {
      return new Uint8Array(body);
    }

    if ("arrayBuffer" in body) {
      return new Uint8Array(await (body as Blob).arrayBuffer());
    }

    return this.readStream(body as ReadableStream<Uint8Array>);
  }

  private async readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
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

  private walkDir(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);

      if (!fullPath.startsWith(this.resolvedRoot + sep)) {
        continue;
      }

      if (entry.isDirectory()) {
        results.push(...this.walkDir(fullPath));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }

    return results;
  }
}

export function localStorageProvider(
  options: ILocalStorageProviderOptions,
): LocalStorageProvider {
  return new LocalStorageProvider(options);
}

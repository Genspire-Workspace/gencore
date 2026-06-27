// file: packages/storage/src/infrastructure/providers/s3-storage-provider.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
import type { IS3StorageProviderOptions } from "../../application/contracts/storage-options.js";

export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly options: IS3StorageProviderOptions;

  constructor(options: IS3StorageProviderOptions) {
    this.options = options;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle,
    });
  }

  async putObject(input: IPutObjectInput): Promise<IStoredObject> {
    const bytes = await this.bodyToBytes(input.body);

    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: bytes,
      ContentType: input.contentType,
      Metadata: input.metadata
        ? Object.fromEntries(
            Object.entries(input.metadata).map(([k, v]) => [k.toLowerCase(), v]),
          )
        : undefined,
    });

    const result = await this.client.send(command);

    return {
      bucket: input.bucket,
      key: input.key,
      size: bytes.byteLength,
      contentType: input.contentType,
      etag: result.ETag?.replace(/^"|"$/g, "") ?? undefined,
      metadata: input.metadata,
    };
  }

  async getObject(ref: IStorageObjectRef): Promise<IGetObjectResult | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: ref.bucket,
        Key: ref.key,
      });

      const result = await this.client.send(command);

      if (!result.Body) {
        return null;
      }

      const body = result.Body.transformToWebStream
        ? result.Body.transformToWebStream()
        : (result.Body as unknown as ReadableStream<Uint8Array>);

      return {
        bucket: ref.bucket,
        key: ref.key,
        size: result.ContentLength,
        contentType: result.ContentType,
        etag: result.ETag?.replace(/^"|"$/g, "") ?? undefined,
        metadata: result.Metadata
          ? Object.fromEntries(
              Object.entries(result.Metadata).map(([k, v]) => [k, v]),
            )
          : undefined,
        createdAt: result.LastModified,
        updatedAt: result.LastModified,
        body: body as ReadableStream<Uint8Array>,
      };
    } catch (error: unknown) {
      if (error instanceof NoSuchKey || (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(ref: IStorageObjectRef): Promise<boolean> {
    const existed = await this.exists(ref);
    if (!existed) {
      return false;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: ref.bucket,
        Key: ref.key,
      }),
    );

    return true;
  }

  async exists(ref: IStorageObjectRef): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: ref.bucket,
          Key: ref.key,
        }),
      );
      return true;
    } catch (error: unknown) {
      if (
        error instanceof NoSuchKey ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async listObjects(input: IListObjectsInput): Promise<IListObjectsResult> {
    const command = new ListObjectsV2Command({
      Bucket: input.bucket,
      Prefix: input.prefix,
      MaxKeys: input.limit,
      ContinuationToken: input.cursor,
    });

    const result = await this.client.send(command);

    const items: IStoredObject[] = (result.Contents ?? []).map((obj: _Object) => ({
      bucket: input.bucket,
      key: obj.Key ?? "",
      size: obj.Size,
      etag: obj.ETag?.replace(/^"|"$/g, "") ?? undefined,
      updatedAt: obj.LastModified,
    }));

    return {
      items,
      cursor: result.NextContinuationToken,
      hasMore: result.IsTruncated ?? false,
    };
  }

  getPublicUrl(ref: IStorageObjectRef): string {
    if (this.options.publicBaseUrl) {
      const base = this.options.publicBaseUrl.replace(/\/+$/, "");
      const encodedKey = ref.key
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return `${base}/${encodeURIComponent(ref.bucket)}/${encodedKey}`;
    }

    if (this.options.endpoint) {
      const endpoint = this.options.endpoint.replace(/\/+$/, "");
      return `${endpoint}/${encodeURIComponent(ref.bucket)}/${encodeURIComponent(ref.key)}`;
    }

    throw new Error(
      "getPublicUrl requires publicBaseUrl or endpoint to be configured in S3StorageProvider options.",
    );
  }

  async createSignedUrl(input: ICreateSignedUrlInput): Promise<string> {
    const command =
      input.method === "PUT"
        ? new PutObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
          })
        : new GetObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
          });

    return getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });
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

    if (typeof Blob !== "undefined" && body instanceof Blob) {
      return new Uint8Array(await body.arrayBuffer());
    }

    return this.readStream(body as ReadableStream<Uint8Array>);
  }

  private async readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
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
}

export function s3StorageProvider(
  options: IS3StorageProviderOptions,
): S3StorageProvider {
  return new S3StorageProvider(options);
}

// file: packages\storage\src\s3\s3-storage-provider.test.ts

import { describe, expect, test } from "bun:test";
import { S3StorageProvider, s3StorageProvider } from "./s3-storage-provider.js";
import type { IS3StorageProviderOptions } from "../contracts/storage-options.js";

function createOptions(overrides: Partial<IS3StorageProviderOptions> = {}): IS3StorageProviderOptions {
  return {
    region: "us-east-1",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
    endpoint: "http://localhost:9000",
    forcePathStyle: true,
    defaultBucket: "playground",
    publicBaseUrl: "http://localhost:9000/playground",
    ...overrides,
  };
}

describe("S3StorageProvider", () => {
  test("constructs with MinIO-compatible options", () => {
    const provider = s3StorageProvider(createOptions());
    expect(provider).toBeInstanceOf(S3StorageProvider);
  });

  test("factory creates S3StorageProvider", () => {
    const provider = s3StorageProvider(createOptions());
    expect(provider.getPublicUrl).toBeFunction();
    expect(provider.createSignedUrl).toBeFunction();
  });

  describe("getPublicUrl", () => {
    test("builds URL from publicBaseUrl with bucket and key", () => {
      const provider = s3StorageProvider(
        createOptions({
          publicBaseUrl: "https://cdn.example.com",
          endpoint: undefined,
        }),
      );

      const url = provider.getPublicUrl({ bucket: "avatars", key: "users/123/photo.png" });
      expect(url).toBe("https://cdn.example.com/avatars/users/123/photo.png");
    });

    test("encodes special characters in key segments", () => {
      const provider = s3StorageProvider(
        createOptions({ publicBaseUrl: "https://cdn.example.com" }),
      );

      const url = provider.getPublicUrl({ bucket: "files", key: "folder/file name.txt" });
      expect(url).toContain("file%20name.txt");
    });

    test("encodes special characters in bucket", () => {
      const provider = s3StorageProvider(
        createOptions({ publicBaseUrl: "https://cdn.example.com" }),
      );

      const url = provider.getPublicUrl({ bucket: "my bucket", key: "file.txt" });
      expect(url).toBe("https://cdn.example.com/my%20bucket/file.txt");
    });

    test("strips trailing slash from publicBaseUrl", () => {
      const provider = s3StorageProvider(
        createOptions({ publicBaseUrl: "https://cdn.example.com/" }),
      );

      const url = provider.getPublicUrl({ bucket: "b", key: "k.txt" });
      expect(url).toBe("https://cdn.example.com/b/k.txt");
    });

    test("falls back to endpoint when no publicBaseUrl", () => {
      const provider = s3StorageProvider(
        createOptions({
          publicBaseUrl: undefined,
          endpoint: "http://minio:9000",
        }),
      );

      const url = provider.getPublicUrl({ bucket: "b", key: "k.txt" });
      expect(url).toBe("http://minio:9000/b/k.txt");
    });

    test("throws when neither publicBaseUrl nor endpoint configured", () => {
      const provider = s3StorageProvider(
        createOptions({ publicBaseUrl: undefined, endpoint: undefined }),
      );

      expect(() => provider.getPublicUrl({ bucket: "b", key: "k.txt" }))
        .toThrow("publicBaseUrl");
    });
  });
});

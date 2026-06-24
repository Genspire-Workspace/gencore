// file: packages\storage\src\services\storage-service.test.ts

import { describe, expect, test, mock } from "bun:test";
import { StorageService } from "./storage-service.js";
import type { IStorageProvider } from "../contracts/storage-provider.js";
import type { IStoredObject, IGetObjectResult, IListObjectsResult } from "../contracts/storage-object.js";

function createMockProvider(): IStorageProvider {
  return {
    putObject: mock(async () => ({ bucket: "b", key: "k", size: 0 }) as IStoredObject),
    getObject: mock(async () => ({ bucket: "b", key: "k", body: new ReadableStream() }) as IGetObjectResult),
    deleteObject: mock(async () => true),
    exists: mock(async () => true),
    listObjects: mock(async () => ({ items: [], hasMore: false }) as IListObjectsResult),
    getPublicUrl: mock(async () => "http://example.com/file"),
    createSignedUrl: mock(async () => "http://signed.example.com"),
  };
}

describe("StorageService", () => {
  test("delegates putObject to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    await service.putObject({ bucket: "b", key: "k", body: "x" });

    expect(provider.putObject).toHaveBeenCalledWith({ bucket: "b", key: "k", body: "x" });
  });

  test("delegates getObject to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    await service.getObject({ bucket: "b", key: "k" });

    expect(provider.getObject).toHaveBeenCalledWith({ bucket: "b", key: "k" });
  });

  test("delegates deleteObject to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    await service.deleteObject({ bucket: "b", key: "k" });

    expect(provider.deleteObject).toHaveBeenCalledWith({ bucket: "b", key: "k" });
  });

  test("delegates exists to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    await service.exists({ bucket: "b", key: "k" });

    expect(provider.exists).toHaveBeenCalledWith({ bucket: "b", key: "k" });
  });

  test("delegates listObjects to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    await service.listObjects({ bucket: "b" });

    expect(provider.listObjects).toHaveBeenCalledWith({ bucket: "b" });
  });

  test("delegates getPublicUrl to provider", async () => {
    const provider = createMockProvider();
    const service = new StorageService(provider);

    const result = await service.getPublicUrl({ bucket: "b", key: "k" });

    expect(result).toBe("http://example.com/file");
    expect(provider.getPublicUrl).toHaveBeenCalled();
  });

  test("returns null for getPublicUrl when provider has no method", async () => {
    const provider: IStorageProvider = {
      putObject: mock(async () => ({ bucket: "b", key: "k" }) as IStoredObject),
      getObject: mock(async () => null),
      deleteObject: mock(async () => false),
      exists: mock(async () => false),
      listObjects: mock(async () => ({ items: [], hasMore: false }) as IListObjectsResult),
    };
    const service = new StorageService(provider);

    const result = await service.getPublicUrl({ bucket: "b", key: "k" });
    expect(result).toBeNull();
  });

  test("returns null for createSignedUrl when provider has no method", async () => {
    const provider: IStorageProvider = {
      putObject: mock(async () => ({ bucket: "b", key: "k" }) as IStoredObject),
      getObject: mock(async () => null),
      deleteObject: mock(async () => false),
      exists: mock(async () => false),
      listObjects: mock(async () => ({ items: [], hasMore: false }) as IListObjectsResult),
    };
    const service = new StorageService(provider);

    const result = await service.createSignedUrl({ bucket: "b", key: "k" });
    expect(result).toBeNull();
  });
});

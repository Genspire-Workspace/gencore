// file: packages/storage/src/application/services/storage-service.ts

import { Singleton } from "@genspire/core";
import type { IStorageProvider } from "../contracts/storage-provider.js";
import type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "../contracts/storage-object.js";

@Singleton()
export class StorageService {
  constructor(private readonly provider: IStorageProvider) {}

  putObject(input: IPutObjectInput): Promise<IStoredObject> {
    return this.provider.putObject(input);
  }

  getObject(ref: IStorageObjectRef): Promise<IGetObjectResult | null> {
    return this.provider.getObject(ref);
  }

  deleteObject(ref: IStorageObjectRef): Promise<boolean> {
    return this.provider.deleteObject(ref);
  }

  exists(ref: IStorageObjectRef): Promise<boolean> {
    return this.provider.exists(ref);
  }

  listObjects(input: IListObjectsInput): Promise<IListObjectsResult> {
    return this.provider.listObjects(input);
  }

  async getPublicUrl(ref: IStorageObjectRef): Promise<string | null> {
    if (!this.provider.getPublicUrl) {
      return null;
    }

    return await this.provider.getPublicUrl(ref);
  }

  async createSignedUrl(input: ICreateSignedUrlInput): Promise<string | null> {
    if (!this.provider.createSignedUrl) {
      return null;
    }

    return await this.provider.createSignedUrl(input);
  }
}

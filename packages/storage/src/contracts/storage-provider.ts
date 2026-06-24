// file: packages\storage\src\contracts\storage-provider.ts

import type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "./storage-object.js";

export interface IStorageProvider {
  putObject(input: IPutObjectInput): Promise<IStoredObject>;
  getObject(ref: IStorageObjectRef): Promise<IGetObjectResult | null>;
  deleteObject(ref: IStorageObjectRef): Promise<boolean>;
  exists(ref: IStorageObjectRef): Promise<boolean>;
  listObjects(input: IListObjectsInput): Promise<IListObjectsResult>;
  getPublicUrl?(ref: IStorageObjectRef): string | Promise<string>;
  createSignedUrl?(input: ICreateSignedUrlInput): Promise<string>;
}

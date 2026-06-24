export type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "./contracts/storage-object.js";

export type { IStorageProvider } from "./contracts/storage-provider.js";
export type {
  ILocalStorageProviderOptions,
  IStorageExtensionOptions,
} from "./contracts/storage-options.js";

export { storageExtension } from "./extension/storage-extension.js";
export { LocalStorageProvider, localStorageProvider } from "./local/local-storage-provider.js";
export { StorageService } from "./services/storage-service.js";

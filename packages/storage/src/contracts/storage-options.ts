// file: packages\storage\src\contracts\storage-options.ts

import type { IStorageProvider } from "./storage-provider.js";

export interface IStorageExtensionOptions {
  provider: IStorageProvider;
  defaultBucket?: string;
}

export interface ILocalStorageProviderOptions {
  rootDirectory: string;
  publicBaseUrl?: string;
}

export interface IS3StorageProviderOptions {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  defaultBucket?: string;
  publicBaseUrl?: string;
}

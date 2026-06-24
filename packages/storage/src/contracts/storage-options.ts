import type { IStorageProvider } from "./storage-provider.js";

export interface IStorageExtensionOptions {
  provider: IStorageProvider;
  defaultBucket?: string;
}

export interface ILocalStorageProviderOptions {
  rootDirectory: string;
  publicBaseUrl?: string;
}

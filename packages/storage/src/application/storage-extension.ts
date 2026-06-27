// file: packages/storage/src/application/storage-extension.ts

import type { GenExtension } from "@genspire/core";
import { StorageService } from "./services/storage-service.js";
import type { IStorageExtensionOptions } from "./contracts/storage-options.js";

export function storageExtension(options: IStorageExtensionOptions): GenExtension {
  return {
    name: "storage",

    register(app) {
      app.provide(StorageService, new StorageService(options.provider));
    },
  };
}

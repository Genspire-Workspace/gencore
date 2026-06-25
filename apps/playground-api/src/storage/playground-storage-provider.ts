// file: apps\playground-api\src\storage\playground-storage-provider.ts

import type { IStorageProvider } from "@genspire/storage";
import { localStorageProvider, s3StorageProvider } from "@genspire/storage";
import type { IPlaygroundEnv } from "../config/playground-env.js";

export function createPlaygroundStorageProvider(
  env: IPlaygroundEnv,
): IStorageProvider {
  if (env.storage.provider === "s3") {
    return s3StorageProvider({
      endpoint: env.storage.s3.endpoint,
      region: env.storage.s3.region,
      accessKeyId: env.storage.s3.accessKeyId,
      secretAccessKey: env.storage.s3.secretAccessKey,
      forcePathStyle: env.storage.s3.forcePathStyle,
      defaultBucket: env.storage.s3.defaultBucket,
      publicBaseUrl: env.storage.s3.publicBaseUrl,
    });
  }

  return localStorageProvider({
    rootDirectory: env.storage.localRoot,
    publicBaseUrl: env.storage.publicBaseUrl,
  });
}

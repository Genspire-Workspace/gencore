// file: packages/storage/src/server/storage-server-extension.ts

import type { GenExtension } from "@genspire/core";
import { Server } from "@genspire/server";
import { FileController } from "./controllers/file.controller.js";

export interface IStorageServerExtensionOptions {
  /**
   * Optional route prefix applied to storage controllers.
   * Defaults to no prefix (controllers already declare their own paths).
   */
  routePrefix?: string;
}

export function storageServerExtension(
  options: IStorageServerExtensionOptions = {},
): GenExtension {
  return {
    name: "storage-server",
    dependsOn: ["server", "storage"],

    register(app) {
      const server = app.get(Server);
      const controllers = [FileController];

      if (options.routePrefix) {
        server.group(options.routePrefix, () => {
          server.registerControllers(...controllers);
        });
      } else {
        server.registerControllers(...controllers);
      }
    },
  };
}
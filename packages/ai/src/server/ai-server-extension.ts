// file: packages/ai/src/server/ai-server-extension.ts

import type { GenExtension } from "@genspire/core";
import { Server } from "@genspire/server";
import { AiAdminGenerationController, AiProviderController, AiSessionController } from "./controllers/index.js";

export interface IAiServerExtensionOptions {
  routePrefix?: string;
}

export function aiServerExtension(
  options: IAiServerExtensionOptions = {},
): GenExtension {
  return {
    name: "ai-server",
    dependsOn: ["server", "ai"],
    register(app) {
      const server = app.get(Server);
      const controllers = [AiAdminGenerationController, AiSessionController, AiProviderController];

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

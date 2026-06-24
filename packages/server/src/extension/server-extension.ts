import type { GenExtension } from "@genspire/core";
import { LoggerFactory } from "@genspire/core";
import { Server, type ServerOptions } from "../server/server.js";

export interface ServerExtensionOptions extends Omit<Partial<ServerOptions>, "container" | "loggerFactory"> {
  port?: number;
}

export function serverExtension(options: ServerExtensionOptions = {}): GenExtension {
  return {
    name: "server",

    register(app) {
      const server = new Server({
        ...options,
        container: app.container,
        loggerFactory: app.get(LoggerFactory),
      });

      app.provide(Server, server);
    },

    async start(app) {
      await app.get(Server).start();
    },

    async stop(app) {
      await app.get(Server).stop();
    },
  };
}

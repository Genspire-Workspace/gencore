// file: packages/core/src/app/define-app.ts

import type { GenApp } from "./gen-app.js";
import { runApp, stopApp } from "./run-app.js";

export interface IDefineAppOptions {
  key: string;
  create: () => GenApp | Promise<GenApp>;
  registerProcessHandlers?: boolean;
}

export interface IDefinedApp {
  readonly key: string;
  create(): Promise<GenApp>;
  run(): Promise<GenApp>;
  stop(): Promise<void>;
}

export function defineApp(options: IDefineAppOptions): IDefinedApp {
  return {
    key: options.key,

    async create(): Promise<GenApp> {
      return await options.create();
    },

    async run(): Promise<GenApp> {
      return await runApp(options.create, {
        key: options.key,
        registerProcessHandlers: options.registerProcessHandlers,
      });
    },

    async stop(): Promise<void> {
      await stopApp({
        key: options.key,
        registerProcessHandlers: options.registerProcessHandlers,
      });
    },
  };
}

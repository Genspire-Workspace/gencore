// file: packages/core/src/app/run-app.ts

import type { GenApp } from "./gen-app.js";

export interface IRunAppOptions {
  key?: string;
  registerProcessHandlers?: boolean;
}

interface IHotReloadAppState {
  app?: GenApp;
  lifecycle: Promise<GenApp | undefined>;
  processHandlersRegistered: boolean;
}

const DEFAULT_RUN_APP_KEY = "default";
const HOT_RELOAD_APP_STATES_KEY = Symbol.for("@genspire/core/app/run-app");

type HotReloadGlobal = typeof globalThis & {
  [HOT_RELOAD_APP_STATES_KEY]?: Map<string, IHotReloadAppState>;
};

function getHotReloadAppStates(): Map<string, IHotReloadAppState> {
  const hotReloadGlobal = globalThis as HotReloadGlobal;
  hotReloadGlobal[HOT_RELOAD_APP_STATES_KEY] ??= new Map<string, IHotReloadAppState>();
  return hotReloadGlobal[HOT_RELOAD_APP_STATES_KEY];
}

function getOrCreateHotReloadAppState(key: string): IHotReloadAppState {
  const states = getHotReloadAppStates();
  const existing = states.get(key);
  if (existing) {
    return existing;
  }

  const created: IHotReloadAppState = {
    lifecycle: Promise.resolve(undefined),
    processHandlersRegistered: false,
  };

  states.set(key, created);
  return created;
}

function normalizeRunAppOptions(options?: IRunAppOptions): Required<IRunAppOptions> {
  return {
    key: options?.key ?? DEFAULT_RUN_APP_KEY,
    registerProcessHandlers: options?.registerProcessHandlers ?? true,
  };
}

export async function stopApp(options?: IRunAppOptions): Promise<void> {
  const normalizedOptions = normalizeRunAppOptions(options);
  const state = getOrCreateHotReloadAppState(normalizedOptions.key);

  state.lifecycle = state.lifecycle.catch(() => undefined).then(async () => {
    const currentApp = state.app;
    state.app = undefined;

    if (currentApp) {
      await currentApp.stop();
    }

    return undefined;
  });

  await state.lifecycle;
}

function registerProcessHandlers(options?: IRunAppOptions): void {
  const normalizedOptions = normalizeRunAppOptions(options);
  const state = getOrCreateHotReloadAppState(normalizedOptions.key);

  if (!normalizedOptions.registerProcessHandlers || state.processHandlersRegistered) {
    return;
  }

  const stopCurrentApp = async () => {
    await stopApp(normalizedOptions);
  };

  process.once("beforeExit", stopCurrentApp);
  process.once("SIGINT", stopCurrentApp);
  process.once("SIGTERM", stopCurrentApp);
  state.processHandlersRegistered = true;
}

export async function runApp(
  factory: () => GenApp | Promise<GenApp>,
  options?: IRunAppOptions,
): Promise<GenApp> {
  const normalizedOptions = normalizeRunAppOptions(options);
  const state = getOrCreateHotReloadAppState(normalizedOptions.key);

  registerProcessHandlers(normalizedOptions);

  state.lifecycle = state.lifecycle.catch(() => undefined).then(async () => {
    const previousApp = state.app;
    state.app = undefined;

    if (previousApp) {
      await previousApp.stop();
    }

    const app = await factory();
    await app.start();
    state.app = app;
    return app;
  });

  return await state.lifecycle as GenApp;
}

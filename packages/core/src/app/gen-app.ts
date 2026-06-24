// file: packages\core\src\app\gen-app.ts

import { EnvService } from "../config/env-service.js";
import { Container, type Constructor, type ServiceToken } from "../container/container.js";
import type { ScopedContainer } from "../container/scoped-container.js";
import { EventBus } from "../events/event-bus.js";
import { LogStore } from "../logging/log-store.js";
import { LoggerFactory } from "../logging/logger-factory.js";
import type { GenAppOptions } from "./gen-app-options.js";
import type { GenExtension } from "./gen-extension.js";

export class GenApp {
  public readonly container: Container;
  private readonly extensions = new Map<string, GenExtension>();
  private started = false;
  private stopping = false;

  constructor(options: GenAppOptions = {}) {
    this.container = new Container();

    this.container.registerInstance(EnvService, new EnvService());
    this.container.registerInstance(EventBus, new EventBus());
    this.container.registerInstance(LogStore, new LogStore());
    this.container.registerInstance(
      LoggerFactory,
      new LoggerFactory(this.get(LogStore)),
    );

    for (const extension of options.extensions ?? []) {
      if (this.extensions.has(extension.name)) {
        throw new Error(`Extension '${extension.name}' is already registered.`);
      }

      for (const dependency of extension.dependsOn ?? []) {
        if (!this.extensions.has(dependency)) {
          throw new Error(
            `Extension '${extension.name}' depends on '${dependency}', which must be registered first.`,
          );
        }
      }

      this.extensions.set(extension.name, extension);
      const result = extension.register?.(this);
      if (result instanceof Promise) {
        throw new Error(
          `Extension '${extension.name}' uses async register(), which cannot be used through GenApp constructor options. Call app.use() explicitly instead.`,
        );
      }
    }
  }

  async use(extension: GenExtension): Promise<this> {
    if (this.started) {
      throw new Error(`Cannot register extension '${extension.name}' after app.start().`);
    }

    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension '${extension.name}' is already registered.`);
    }

    for (const dependency of extension.dependsOn ?? []) {
      if (!this.extensions.has(dependency)) {
        throw new Error(
          `Extension '${extension.name}' depends on '${dependency}', which must be registered first.`,
        );
      }
    }

    this.extensions.set(extension.name, extension);
    await extension.register?.(this);
    return this;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    for (const extension of this.extensions.values()) {
      await extension.start?.(this);
    }

    this.started = true;
  }

  async stop(): Promise<void> {
    if ((!this.started && this.extensions.size === 0) || this.stopping) {
      return;
    }

    this.stopping = true;

    try {
      const registered = [...this.extensions.values()].reverse();
      for (const extension of registered) {
        await extension.stop?.(this);
      }
      await this.container.destroy();
      this.started = false;
    } finally {
      this.stopping = false;
    }
  }

  provide<T>(token: ServiceToken<T>, instance: T): void {
    this.container.registerInstance(token, instance);
  }

  registerSingleton<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.container.registerSingleton(token, implementation);
  }

  registerScoped<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.container.registerScoped(token, implementation);
  }

  registerTransient<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.container.registerTransient(token, implementation);
  }

  autoRegister(...types: Constructor[]): void {
    this.container.autoRegister(...types);
  }

  get<T>(token: ServiceToken<T>): T {
    return this.container.resolve(token);
  }

  createScope(): ScopedContainer {
    return this.container.createScope();
  }

  hasExtension(name: string): boolean {
    return this.extensions.has(name);
  }

  listExtensions(): readonly string[] {
    return [...this.extensions.keys()];
  }
}

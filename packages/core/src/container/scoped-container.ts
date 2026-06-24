// file: packages\core\src\container\scoped-container.ts

import { hasOnDestroy } from "../lifecycle/lifecycle.js";
import type { Container, ServiceToken } from "./container.js";

export class ScopedContainer {
  private readonly instances = new Map<ServiceToken, unknown>();
  private readonly destroyables = new Set<unknown>();

  constructor(private readonly root: Container) {}

  resolve<T>(token: ServiceToken<T>): T {
    const registration = this.root.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }

    if (registration.lifetime === "singleton") {
      return this.root.resolveSingleton(token);
    }

    if (registration.lifetime === "transient") {
      if (!registration.implementation) {
        throw new Error(`No implementation registered for: ${token.name}`);
      }
      return this.root.instantiate(registration.implementation, this);
    }

    const existing = this.instances.get(token);
    if (existing !== undefined) {
      return existing as T;
    }

    if (!registration.implementation) {
      throw new Error(`No implementation registered for: ${token.name}`);
    }

    const instance = this.root.instantiate(registration.implementation, this);
    this.instances.set(token, instance);
    return instance;
  }

  trackDestroyable(instance: unknown): void {
    if (hasOnDestroy(instance)) {
      this.destroyables.add(instance);
    }
  }

  async destroy(): Promise<void> {
    for (const value of [...this.destroyables].reverse()) {
      if (hasOnDestroy(value)) {
        await value.onDestroy();
      }
    }

    this.destroyables.clear();
    this.instances.clear();
  }
}

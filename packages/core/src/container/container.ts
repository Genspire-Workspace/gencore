import { hasOnDestroy, hasOnInit } from "../lifecycle/lifecycle.js";
import { getLifetime } from "./decorators.js";
import { runInInjectionContext } from "./injection-context.js";
import { ScopedContainer } from "./scoped-container.js";

export type Constructor<T = unknown> = new (...args: any[]) => T;
export type ServiceToken<T = unknown> = Constructor<T>;
export type Lifetime = "singleton" | "scoped" | "transient";

interface Registration<T = unknown> {
  token: ServiceToken<T>;
  lifetime: Lifetime;
  implementation?: Constructor<T>;
  instance?: T;
}

export class Container {
  private readonly registrations = new Map<ServiceToken, Registration>();
  private readonly singletons = new Map<ServiceToken, unknown>();
  private readonly destroyables = new Set<unknown>();

  registerSingleton<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.registrations.set(token, {
      token,
      lifetime: "singleton",
      implementation: implementation ?? token,
    });
  }

  registerScoped<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.registrations.set(token, {
      token,
      lifetime: "scoped",
      implementation: implementation ?? token,
    });
  }

  registerTransient<T>(token: ServiceToken<T>, implementation?: Constructor<T>): void {
    this.registrations.set(token, {
      token,
      lifetime: "transient",
      implementation: implementation ?? token,
    });
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    this.registrations.set(token, {
      token,
      lifetime: "singleton",
      instance,
    });
    this.singletons.set(token, instance);
    this.trackDestroyable(instance);
  }

  autoRegister(...types: Constructor[]): void {
    for (const type of types) {
      const lifetime = getLifetime(type);
      if (lifetime === "singleton") {
        this.registerSingleton(type);
      } else if (lifetime === "scoped") {
        this.registerScoped(type);
      } else if (lifetime === "transient") {
        this.registerTransient(type);
      }
    }
  }

  createScope(): ScopedContainer {
    return new ScopedContainer(this);
  }

  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token) || getLifetime(token) != null;
  }

  getRegistration<T>(token: ServiceToken<T>): Readonly<Registration<T>> | undefined {
    return this.ensureRegistration(token);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const registration = this.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }

    if (registration.lifetime === "singleton") {
      return this.resolveSingleton(token);
    }

    if (registration.lifetime === "transient") {
      if (!registration.implementation) {
        throw new Error(`No implementation registered for: ${token.name}`);
      }
      return this.instantiate(registration.implementation);
    }

    throw new Error(`Scoped dependency ${token.name} requires a scope.`);
  }

  resolveSingleton<T>(token: ServiceToken<T>): T {
    const existing = this.singletons.get(token);
    if (existing !== undefined) {
      return existing as T;
    }

    const registration = this.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }

    if (registration.instance !== undefined) {
      this.singletons.set(token, registration.instance);
      return registration.instance;
    }

    if (!registration.implementation) {
      throw new Error(`No implementation registered for: ${token.name}`);
    }

    const instance = this.instantiate(registration.implementation);
    this.singletons.set(token, instance);
    return instance;
  }

  instantiate<T>(type: Constructor<T>, scope?: ScopedContainer): T {
    const injections: ServiceToken[] = (type as Constructor & { inject?: ServiceToken[] }).inject ?? [];
    const resolver = <TDependency>(token: ServiceToken<TDependency>): TDependency =>
      scope ? scope.resolve(token) : this.resolve(token);

    const args = injections.map((token) => resolver(token));
    const instance = runInInjectionContext(resolver, () => new type(...args));

    if (hasOnInit(instance)) {
      instance.onInit();
    }

    if (scope) {
      scope.trackDestroyable(instance);
    } else {
      this.trackDestroyable(instance);
    }

    return instance;
  }

  async destroy(): Promise<void> {
    for (const value of [...this.destroyables].reverse()) {
      if (hasOnDestroy(value)) {
        await value.onDestroy();
      }
    }

    this.destroyables.clear();
    this.singletons.clear();
  }

  ensureRegistration<T>(token: ServiceToken<T>): Registration<T> | undefined {
    const existing = this.registrations.get(token);
    if (existing) {
      return existing as Registration<T>;
    }

    const lifetime = getLifetime(token);
    if (!lifetime) {
      return undefined;
    }

    if (lifetime === "singleton") {
      this.registerSingleton(token);
    } else if (lifetime === "scoped") {
      this.registerScoped(token);
    } else {
      this.registerTransient(token);
    }

    return this.registrations.get(token) as Registration<T> | undefined;
  }

  private trackDestroyable(instance: unknown): void {
    if (hasOnDestroy(instance)) {
      this.destroyables.add(instance);
    }
  }
}

import type { Constructor, Lifetime } from "./container.js";
export { inject } from "./injection-context.js";

type LifetimeAwareConstructor<T = unknown> = Constructor<T> & {
  __diLifetime?: Lifetime;
};

function setLifetime(target: Constructor, lifetime: Lifetime): void {
  (target as LifetimeAwareConstructor).__diLifetime = lifetime;
}

export function getLifetime(target: Constructor): Lifetime | undefined {
  return (target as LifetimeAwareConstructor).__diLifetime;
}

export function Singleton(): <T extends Constructor>(target: T) => void {
  return <T extends Constructor>(target: T): void => {
    setLifetime(target, "singleton");
  };
}

export function Scoped(): <T extends Constructor>(target: T) => void {
  return <T extends Constructor>(target: T): void => {
    setLifetime(target, "scoped");
  };
}

export function Transient(): <T extends Constructor>(target: T) => void {
  return <T extends Constructor>(target: T): void => {
    setLifetime(target, "transient");
  };
}

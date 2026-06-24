// file: packages\core\src\container\injection-context.ts

import type { ServiceToken } from "./container.js";

type InjectionResolver = <T>(token: ServiceToken<T>) => T;

const resolverStack: InjectionResolver[] = [];

export function runInInjectionContext<T>(
  resolver: InjectionResolver,
  factory: () => T,
): T {
  resolverStack.push(resolver);

  try {
    return factory();
  } finally {
    resolverStack.pop();
  }
}

export function inject<T>(token: ServiceToken<T>): T {
  const resolver = resolverStack[resolverStack.length - 1];
  if (!resolver) {
    throw new Error(`inject(${token.name}) was called outside an active injection context.`);
  }

  return resolver(token);
}

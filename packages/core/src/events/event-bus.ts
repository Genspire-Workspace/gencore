// file: packages\core\src\events\event-bus.ts

import type { Constructor, Container } from "../container/container.js";
import type { ScopedContainer } from "../container/scoped-container.js";
import { Singleton } from "../container/decorators.js";
import { LoggerFactory } from "../logging/logger-factory.js";
import { getEventHandlerMetadata } from "./event-subscriber.js";

export interface AppEvent<TPayload = unknown> {
  name: string;
  payload: TPayload;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export type AppEventHandler<TPayload = unknown> = (
  event: AppEvent<TPayload>,
) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

@Singleton()
export class EventBus {
  private readonly handlers = new Map<string, Set<AppEventHandler>>();

  on<TPayload = unknown>(
    eventName: string,
    handler: AppEventHandler<TPayload>,
  ): EventSubscription {
    const handlers = this.handlers.get(eventName) ?? new Set<AppEventHandler>();
    handlers.add(handler as AppEventHandler);
    this.handlers.set(eventName, handlers);

    return {
      unsubscribe: () => {
        handlers.delete(handler as AppEventHandler);
        if (handlers.size === 0) {
          this.handlers.delete(eventName);
        }
      },
    };
  }

  once<TPayload = unknown>(
    eventName: string,
    handler: AppEventHandler<TPayload>,
  ): EventSubscription {
    let subscription: EventSubscription | undefined;
    const wrapped: AppEventHandler<TPayload> = async (event) => {
      subscription?.unsubscribe();
      await handler(event);
    };

    subscription = this.on(eventName, wrapped);
    return subscription;
  }

  async emit<TPayload = unknown>(
    eventName: string,
    payload: TPayload,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const event: AppEvent<TPayload> = {
      name: eventName,
      payload,
      occurredAt: new Date().toISOString(),
      metadata,
    };

    for (const handler of this.handlers.get(eventName) ?? []) {
      await handler(event);
    }
  }
}

export function registerEventSubscribers(
  container: Container,
  bus: EventBus,
  types: readonly Constructor[],
): void {
  const logger = container.resolve(LoggerFactory).createLogger("EventBus");

  for (const type of types) {
    for (const { eventName, handlerName } of getEventHandlerMetadata(type)) {
      bus.on(eventName, async (event) => {
        const registration = container.getRegistration(type);
        const scope =
          registration?.lifetime === "singleton" ? undefined : container.createScope();
        const startedAt = Date.now();

        try {
          const instance = scope
            ? scope.resolve(type)
            : container.resolveSingleton(type);
          const handler = (instance as Record<string, unknown>)[handlerName];

          if (typeof handler !== "function") {
            throw new Error(`Event handler '${handlerName}' was not found on '${type.name}'.`);
          }

          await Promise.resolve(handler.call(instance, event));
          logger.info("Event completed", {
            eventName,
            subscriber: type.name,
            handler: handlerName,
            durationMs: Date.now() - startedAt,
          });
        } catch (error) {
          logger.error("Event failed", error, {
            eventName,
            subscriber: type.name,
            handler: handlerName,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        } finally {
          if (scope) {
            await (scope as ScopedContainer).destroy();
          }
        }
      });
    }
  }
}

import { Singleton } from "../container/decorators.js";
import type { Constructor } from "../container/container.js";

export interface EventHandlerMetadata {
  eventName: string;
  handlerName: string;
}

type EventSubscriberConstructor<T = unknown> = Constructor<T> & {
  __isEventSubscriber?: boolean;
  __eventHandlerMetadata?: EventHandlerMetadata[];
};

function ensureMetadata(target: EventSubscriberConstructor): EventHandlerMetadata[] {
  if (!Object.prototype.hasOwnProperty.call(target, "__eventHandlerMetadata")) {
    target.__eventHandlerMetadata = [];
  }

  return target.__eventHandlerMetadata as EventHandlerMetadata[];
}

export function EventSubscriber(): <T extends Constructor>(target: T) => void {
  return <T extends Constructor>(target: T): void => {
    Singleton()(target);
    (target as EventSubscriberConstructor).__isEventSubscriber = true;
  };
}

export function OnEvent(eventName: string): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: EventSubscriberConstructor }).constructor;
    ensureMetadata(ctor).push({
      eventName,
      handlerName: String(propertyKey),
    });
  };
}

export function isEventSubscriber(target: unknown): target is EventSubscriberConstructor {
  return typeof target === "function" && Boolean((target as EventSubscriberConstructor).__isEventSubscriber);
}

export function getEventHandlerMetadata(target: Constructor): readonly EventHandlerMetadata[] {
  return (target as EventSubscriberConstructor).__eventHandlerMetadata ?? [];
}

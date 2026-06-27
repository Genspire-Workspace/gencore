// file: packages/auth/src/domain/events/auth-events.ts

/**
 * Auth domain event names and payloads.
 *
 * These are emitted through the @genspire/core EventBus so other services can
 * react to auth lifecycle events without coupling to auth internals.
 */

/** Emitted after a new user account is successfully created. */
export const AUTH_USER_REGISTERED_EVENT = "auth.user.registered";

export interface IAuthUserRegisteredEventPayload {
  userId: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  registeredAt: string;
}

export type AuthDomainEventName =
  | typeof AUTH_USER_REGISTERED_EVENT;

// file: packages/data/src/contracts/entity.ts

export type EntityState = "active" | "inactive" | "archived" | "deleted";

/**
 * Base contract for persisted entities.
 *
 * `TState` defaults to the generic `EntityState` lifecycle vocabulary, but
 * domains with their own state machine (e.g. auth users) can pass a narrower
 * state union so they can conform to `IEntity` without losing semantics.
 */
export interface IEntity<TId = string, TState extends string = EntityState> {
  id: TId;
  state?: TState;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt?: Date;
}

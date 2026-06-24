export type EntityState = "active" | "inactive" | "archived" | "deleted";

export interface IEntity<TId = string> {
  id: TId;
  state?: EntityState;
  metadata?: Record<string, string> | null;
  createdAt: Date;
  updatedAt?: Date;
}

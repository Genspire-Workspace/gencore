export type EntityState = "active" | "inactive" | "archived" | "deleted";

export interface IEntity<TId = string> {
  id: TId;
  state?: EntityState;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Entity<TId = string> {
  id: TId;
}

export interface AuditableEntity<TId = string> extends Entity<TId> {
  createdAt: Date;
  updatedAt?: Date;
}

export type EntityState = "active" | "inactive" | "deleted";

export interface StatefulEntity {
  state: EntityState;
}

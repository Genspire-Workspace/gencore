import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "todos" })
export class TodoEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  title!: string;

  @Property({ type: "boolean" })
  completed = false;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

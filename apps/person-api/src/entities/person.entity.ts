import { Entity, PrimaryKey, Property, Unique } from "@mikro-orm/decorators/es";

@Entity({ tableName: "people" })
export class PersonEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  firstName!: string;

  @Property({ type: "string" })
  lastName!: string;

  @Property({ type: "string" })
  @Unique()
  email!: string;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

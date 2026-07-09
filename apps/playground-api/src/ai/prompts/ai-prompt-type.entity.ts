import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_prompt_types" })
@Index({ name: "ai_prompt_types_name_index", properties: ["name"] })
export class AiPromptTypeEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "text", nullable: true })
  description: string | null = null;

  @Property({ type: "boolean" })
  isSystem = true;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

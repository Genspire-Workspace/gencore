import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_prompt_type_defaults" })
@Index({ name: "ai_prompt_type_defaults_prompt_id_index", properties: ["promptId"] })
export class AiPromptTypeDefaultEntity {
  @PrimaryKey({ type: "string", fieldName: "type_id" })
  typeId!: string;

  @Property({ type: "string", fieldName: "prompt_id" })
  promptId!: string;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

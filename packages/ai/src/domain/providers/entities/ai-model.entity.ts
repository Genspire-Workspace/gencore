// file: packages\ai\src\domain\providers\entities\ai-model.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { IAiModelCapabilities } from "../../models/ai-model-capabilities.js";

@Entity({ tableName: "ai_models" })
@Index({ name: "ai_models_provider_name_index", properties: ["providerId", "name"] })
@Unique({ name: "ai_models_provider_name_unique", properties: ["providerId", "name"] })
export class AiModelEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  providerId!: string;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string", nullable: true })
  family?: string | null;

  @Property({ type: "json", nullable: true })
  capabilities?: IAiModelCapabilities | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
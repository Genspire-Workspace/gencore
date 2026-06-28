// file: packages\ai\src\domain\providers\entities\ai-api-key.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { AiApiKeySource } from "../../models/ai-api-key.js";

@Entity({ tableName: "ai_provider_api_keys" })
@Index({ name: "ai_provider_api_keys_provider_user_index", properties: ["providerId", "userId"] })
@Unique({ name: "ai_provider_api_keys_provider_user_unique", properties: ["providerId", "userId"] })
export class AiApiKeyEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  providerId!: string;

  @Property({ type: "string" })
  userId!: string;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string", nullable: true })
  value?: string | null;

  @Property({ type: "string", nullable: true })
  env?: string | null;

  @Property({ type: "boolean" })
  enabled: boolean = true;

  @Property({ type: "string" })
  source: AiApiKeySource = "user";

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
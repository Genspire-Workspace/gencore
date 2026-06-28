// file: packages\ai\src\domain\providers\entities\ai-provider.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { AiProviderClientKind } from "../../../providers/ai-provider-client-kind.js";
import type { AiProviderKind } from "../../models/ai-provider.js";

@Entity({ tableName: "ai_providers" })
@Index({ name: "ai_providers_client_kind_index", properties: ["clientKind"] })
@Unique({ name: "ai_providers_name_unique", properties: ["name"] })
export class AiProviderEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "string" })
  kind: AiProviderKind = "custom";

  @Property({ type: "string" })
  clientKind: AiProviderClientKind = "openai-compatible";

  @Property({ type: "string", nullable: true })
  baseUrl?: string | null;

  @Property({ type: "string", nullable: true })
  api?: string | null;

  @Property({ type: "string", nullable: true })
  doc?: string | null;

  @Property({ type: "string", nullable: true })
  website?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
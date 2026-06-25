import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { IEntity } from "@genspire/data";

@Entity({ tableName: "files" })
export class FileEntity implements IEntity<string> {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  bucket!: string;

  @Property({ type: "string" })
  key!: string;

  @Property({ type: "string" })
  originalName!: string;

  @Property({ type: "string", nullable: true })
  contentType?: string | null;

  @Property({ type: "integer" })
  size!: number;

  @Property({ type: "string", nullable: true })
  etag?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, string> | null;

  @Property({ type: "string", nullable: true })
  uploadedBy?: string | null;

  @Property({ type: "string", nullable: true })
  uploaderIp?: string | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

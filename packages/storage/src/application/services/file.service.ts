// file: packages/storage/src/application/services/file.service.ts

import { GenError, Scoped } from "@genspire/core";
import { StorageService } from "./storage-service.js";
import { StorageDbContext } from "../../infrastructure/persistence/storage-db-context.js";
import { FileEntity } from "../../domain/entities/file.entity.js";
import type {
  IFileResult,
  IFileListResult,
  IPreparedUploadResult,
  IDownloadedFile,
} from "../contracts/file-service-results.js";
import type {
  IUploadFileInput,
  IPrepareUploadInput,
  IListFilesInput,
} from "../contracts/file-service-inputs.js";

function toFileResult(entity: {
  id: string;
  bucket: string;
  key: string;
  originalName: string;
  contentType?: string | null;
  size: number;
  etag?: string | null;
  uploadedBy?: string | null;
  uploaderIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IFileResult {
  return {
    id: entity.id,
    bucket: entity.bucket,
    key: entity.key,
    originalName: entity.originalName,
    contentType: entity.contentType,
    size: entity.size,
    etag: entity.etag ?? undefined,
    uploadedBy: entity.uploadedBy ?? undefined,
    uploaderIp: entity.uploaderIp ?? undefined,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

@Scoped()
export class FileService {
  static inject = [StorageDbContext, StorageService];

  constructor(
    private readonly db: StorageDbContext,
    private readonly storage: StorageService,
  ) {}

  async upload(input: IUploadFileInput): Promise<IFileResult> {
    if (!input.file || input.file.size === 0) {
      throw new GenError("File is required and must not be empty.", "FILE_VALIDATION_ERROR");
    }

    const bucket = input.bucket.trim();

    if (!bucket) {
      throw new GenError("Bucket is required.", "FILE_VALIDATION_ERROR");
    }

    const ext = input.originalName.includes(".")
      ? input.originalName.substring(input.originalName.lastIndexOf("."))
      : "";

    const id = crypto.randomUUID();
    const key = `${input.userId}/${id}${ext}`;

    const contentType = input.file.type || undefined;
    const now = new Date();

    const stored = await this.storage.putObject({
      bucket,
      key,
      body: input.file,
      contentType,
      metadata: input.metadata,
    });

    const entity = new FileEntity();
    entity.id = id;
    entity.bucket = bucket;
    entity.key = key;
    entity.originalName = input.originalName;
    entity.contentType = contentType ?? null;
    entity.size = stored.size ?? input.file.size;
    entity.etag = stored.etag ?? null;
    entity.metadata = input.metadata ?? null;
    entity.uploadedBy = input.uploadedBy ?? null;
    entity.uploaderIp = input.uploaderIp ?? null;
    entity.createdAt = now;
    entity.updatedAt = now;

    await this.db.files.add(entity);
    await this.db.saveChanges();

    return toFileResult(entity);
  }

  async prepareUpload(input: IPrepareUploadInput): Promise<IPreparedUploadResult> {
    const bucket = input.bucket.trim();

    if (!bucket) {
      throw new GenError("Bucket is required.", "FILE_VALIDATION_ERROR");
    }

    const ext = input.originalName.includes(".")
      ? input.originalName.substring(input.originalName.lastIndexOf("."))
      : "";

    const id = crypto.randomUUID();
    const key = `${input.userId}/${id}${ext}`;
    const now = new Date();

    const uploadUrl = await this.storage.createSignedUrl({
      bucket,
      key,
      method: "PUT",
    });

    if (!uploadUrl) {
      throw new GenError("Storage provider does not support presigned uploads.", "FILE_UPLOAD_NOT_SUPPORTED");
    }

    const entity = new FileEntity();
    entity.id = id;
    entity.bucket = bucket;
    entity.key = key;
    entity.originalName = input.originalName;
    entity.contentType = null;
    entity.size = 0;
    entity.etag = null;
    entity.metadata = null;
    entity.uploadedBy = input.uploadedBy ?? null;
    entity.uploaderIp = input.uploaderIp ?? null;
    entity.createdAt = now;
    entity.updatedAt = now;

    await this.db.files.add(entity);
    await this.db.saveChanges();

    return {
      entity: toFileResult(entity),
      uploadUrl,
    };
  }

  async list(input: IListFilesInput = {}): Promise<IFileListResult> {
    const { bucket, prefix, limit, cursor } = input;
    const files = await this.db.files.list({
      orderBy: "createdAt",
      direction: "desc",
    });

    let items = files;

    if (bucket) {
      items = items.filter((f) => f.bucket === bucket);
    }

    if (prefix) {
      items = items.filter((f) => f.originalName.startsWith(prefix));
    }

    if (cursor) {
      const cursorIndex = items.findIndex((f) => f.id === cursor);
      if (cursorIndex >= 0) {
        items = items.slice(cursorIndex + 1);
      } else {
        items = [];
      }
    }

    let hasMore = false;
    if (limit !== undefined && items.length > limit) {
      hasMore = true;
      items = items.slice(0, limit);
    }

    return {
      items: items.map(toFileResult),
      cursor: items.length > 0 ? items[items.length - 1]!.id : undefined,
      hasMore,
    };
  }

  async getById(id: string): Promise<IDownloadedFile | null> {
    const entity = await this.db.files.findById(id);
    if (!entity) {
      return null;
    }

    const stored = await this.storage.getObject({
      bucket: entity.bucket,
      key: entity.key,
    });

    if (!stored) {
      return null;
    }

    return {
      entity: toFileResult(entity),
      stream: stored.body,
      contentType: stored.contentType ?? entity.contentType ?? "application/octet-stream",
    };
  }

  async deleteById(id: string): Promise<boolean> {
    const entity = await this.db.files.findById(id);
    if (!entity) {
      return false;
    }

    await this.storage.deleteObject({
      bucket: entity.bucket,
      key: entity.key,
    });

    await this.db.files.removeById(id);
    await this.db.saveChanges();

    return true;
  }
}
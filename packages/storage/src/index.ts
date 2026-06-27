// file: packages/storage/src/index.ts

// Domain
export { FileEntity } from "./domain/entities/file.entity.js";

// Application
export { StorageService } from "./application/services/storage-service.js";
export { FileService } from "./application/services/file.service.js";
export { storageExtension } from "./application/storage-extension.js";

export type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "./application/contracts/storage-object.js";

export type { IStorageProvider } from "./application/contracts/storage-provider.js";
export type {
  ILocalStorageProviderOptions,
  IS3StorageProviderOptions,
  IStorageExtensionOptions,
} from "./application/contracts/storage-options.js";

export type {
  IUploadFileInput,
  IPrepareUploadInput,
  IListFilesInput,
} from "./application/contracts/file-service-inputs.js";

export type {
  IFileResult,
  IFileListResult,
  IPreparedUploadResult,
  IDownloadedFile,
} from "./application/contracts/file-service-results.js";

// Infrastructure
export { StorageDbContext } from "./infrastructure/persistence/storage-db-context.js";
export { LocalStorageProvider, localStorageProvider } from "./infrastructure/providers/local-storage-provider.js";
export { S3StorageProvider, s3StorageProvider } from "./infrastructure/providers/s3-storage-provider.js";

// Server (re-exported for backward compatibility; prefer `@genspire/storage/server`)
export { FileController } from "./server/controllers/file.controller.js";
export {
  FileResponseDto,
  FileListResponseDto,
  UploadFileDto,
  DeleteFileResponseDto,
  PrepareUploadRequestDTO,
  PrepareUploadResponseDTO,
} from "./server/dtos/file.dto.js";
export { storageServerExtension } from "./server/storage-server-extension.js";
export type { IStorageServerExtensionOptions } from "./server/storage-server-extension.js";
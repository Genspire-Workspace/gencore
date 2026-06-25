// file: packages\storage\src\index.ts

export type {
  ICreateSignedUrlInput,
  IGetObjectResult,
  IListObjectsInput,
  IListObjectsResult,
  IPutObjectInput,
  IStorageObjectRef,
  IStoredObject,
} from "./contracts/storage-object.js";

export type { IStorageProvider } from "./contracts/storage-provider.js";
export type {
  ILocalStorageProviderOptions,
  IS3StorageProviderOptions,
  IStorageExtensionOptions,
} from "./contracts/storage-options.js";

export { storageExtension } from "./extension/storage-extension.js";
export { LocalStorageProvider, localStorageProvider } from "./local/local-storage-provider.js";
export { S3StorageProvider, s3StorageProvider } from "./s3/s3-storage-provider.js";
export { StorageService } from "./services/storage-service.js";

export { FileEntity } from "./files/file.entity.js";
export {
  FileResponseDto,
  FileListResponseDto,
  UploadFileDto,
  DeleteFileResponseDto,
  PrepareUploadRequestDTO,
  PrepareUploadResponseDTO,
} from "./files/file.dto.js";
export { FileService } from "./files/file.service.js";
export type { UploadFileInput, PrepareUploadInput } from "./files/file.service.js";
export { FileController } from "./files/file.controller.js";
export { StorageDbContext } from "./files/storage-db-context.js";

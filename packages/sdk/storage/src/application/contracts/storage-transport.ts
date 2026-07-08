import type {
  IStorageFile,
  IStorageFileListResponse,
} from "../../domain/types/storage-sdk-types.js";

export interface IStorageTransport {
  listFiles(): Promise<IStorageFileListResponse>;
  uploadFile(file: File): Promise<IStorageFile>;
  createDownloadUrl(fileId: string): string;
}

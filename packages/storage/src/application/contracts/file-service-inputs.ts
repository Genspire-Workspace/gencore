// file: packages/storage/src/application/contracts/file-service-inputs.ts

export interface IUploadFileInput {
  file: Blob;
  originalName: string;
  bucket: string;
  userId: string;
  metadata?: Record<string, string>;
  uploadedBy?: string;
  uploaderIp?: string | null;
}

export interface IPrepareUploadInput {
  originalName: string;
  bucket: string;
  userId: string;
  uploadedBy?: string;
  uploaderIp?: string | null;
}

export interface IListFilesInput {
  bucket?: string;
  prefix?: string;
  limit?: number;
  cursor?: string;
}
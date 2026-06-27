// file: packages/storage/src/application/contracts/file-service-results.ts

export interface IFileResult {
  id: string;
  bucket: string;
  key: string;
  originalName: string;
  contentType?: string | null;
  size: number;
  etag?: string | null;
  uploadedBy?: string | null;
  uploaderIp?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IFileListResult {
  items: IFileResult[];
  cursor?: string;
  hasMore: boolean;
}

export interface IPreparedUploadResult {
  entity: IFileResult;
  uploadUrl: string;
}

export interface IDownloadedFile {
  entity: IFileResult;
  stream: ReadableStream<Uint8Array>;
  contentType: string;
}
export interface IFileResponse {
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

export interface IFileListResponse {
  items: IFileResponse[];
  cursor?: string;
  hasMore: boolean;
}

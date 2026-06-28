export interface IFileResponseDto {
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

export interface IFileListResponseDto {
  items: IFileResponseDto[];
  cursor?: string;
  hasMore: boolean;
}

export interface IUploadFileDto {
  file: Blob;
}

export interface IDeleteFileResponseDto {
  deleted: boolean;
}

export interface IPrepareUploadRequestDto {
  originalName: string;
}

export interface IPrepareUploadResponseDto {
  entity: IFileResponseDto;
  uploadUrl: string;
}

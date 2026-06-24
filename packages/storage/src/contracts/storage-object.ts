export interface IStorageObjectRef {
  bucket: string;
  key: string;
}

export interface IPutObjectInput extends IStorageObjectRef {
  body: Blob | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array> | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface IStoredObject extends IStorageObjectRef {
  size?: number;
  contentType?: string;
  etag?: string;
  metadata?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGetObjectResult extends IStoredObject {
  body: ReadableStream<Uint8Array>;
}

export interface IListObjectsInput {
  bucket: string;
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface IListObjectsResult {
  items: IStoredObject[];
  cursor?: string;
  hasMore: boolean;
}

export interface ICreateSignedUrlInput extends IStorageObjectRef {
  expiresInSeconds?: number;
  method?: "GET" | "PUT";
}

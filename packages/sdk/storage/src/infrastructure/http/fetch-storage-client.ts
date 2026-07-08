import type { IStorageTransport } from "../../application/contracts/storage-transport.js";
import type {
  IStorageFile,
  IStorageFileListResponse,
} from "../../domain/types/storage-sdk-types.js";
import {
  FetchStorageHttpTransport,
  type IFetchStorageHttpTransportOptions,
} from "./fetch-storage-http-transport.js";

const DEFAULT_STORAGE_API_PATH = "/file";

export interface IFetchStorageClientOptions
  extends IFetchStorageHttpTransportOptions {
  storagePath?: string;
}

export class FetchStorageClient implements IStorageTransport {
  private readonly transport: FetchStorageHttpTransport;
  private readonly storagePath: string;

  constructor(options: IFetchStorageClientOptions | FetchStorageHttpTransport) {
    if (options instanceof FetchStorageHttpTransport) {
      this.transport = options;
      this.storagePath = DEFAULT_STORAGE_API_PATH;
      return;
    }

    this.transport = new FetchStorageHttpTransport(options);
    this.storagePath = options.storagePath ?? DEFAULT_STORAGE_API_PATH;
  }

  async listFiles(): Promise<IStorageFileListResponse> {
    return await this.transport.get<IStorageFileListResponse>(this.storagePath);
  }

  async uploadFile(file: File): Promise<IStorageFile> {
    const formData = new FormData();
    formData.set("file", file, file.name);

    return await this.transport.postFormData<IStorageFile>(
      this.storagePath,
      formData,
    );
  }

  createDownloadUrl(fileId: string): string {
    return this.transport.resolveUrl(`${this.storagePath}/${fileId}`);
  }
}

// file: packages/storage/src/server/dtos/file.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type {
  IDeleteFileResponseDto,
  IFileListResponseDto,
  IFileResponseDto,
  IPrepareUploadRequestDto,
  IPrepareUploadResponseDto,
  IUploadFileDto,
} from "../contracts.js";

@ApiDto({
  description: "A persisted file record",
})
export class FileResponseDto implements IFileResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  bucket!: string;

  @ApiField({ type: "string" })
  key!: string;

  @ApiField({ type: "string" })
  originalName!: string;

  @ApiField({ type: "string", required: false })
  contentType?: string | null;

  @ApiField({ type: "integer" })
  size!: number;

  @ApiField({ type: "string", required: false })
  etag?: string | null;

  @ApiField({ type: "string", required: false })
  uploadedBy?: string | null;

  @ApiField({ type: "string", required: false })
  uploaderIp?: string | null;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({
  description: "A list of file records",
})
export class FileListResponseDto implements IFileListResponseDto {
  @ApiField({
    arrayOf: FileResponseDto,
    description: "File items",
  })
  items!: FileResponseDto[];

  @ApiField({ type: "string", required: false })
  cursor?: string;

  @ApiField({ type: "boolean" })
  hasMore!: boolean;
}

@ApiDto({
  contentType: "multipart/form-data",
  description: "File upload payload. Bucket is derived from the authenticated user.",
})
export class UploadFileDto implements IUploadFileDto {
  @ApiField({ type: "string", format: "binary", description: "The file to upload" })
  file!: Blob;
}

@ApiDto({
  description: "Delete file response",
})
export class DeleteFileResponseDto implements IDeleteFileResponseDto {
  @ApiField({
    type: "boolean",
    description: "Whether the file was deleted.",
  })
  deleted!: boolean;
}

@ApiDto({
  description: "Request to prepare a presigned upload URL",
})
export class PrepareUploadRequestDTO implements IPrepareUploadRequestDto {
  @ApiField({ type: "string", description: "Original file name" })
  originalName!: string;
}

@ApiDto({
  description: "Presigned upload URL response",
})
export class PrepareUploadResponseDTO implements IPrepareUploadResponseDto {
  @ApiField({ type: "object", dto: FileResponseDto })
  entity!: FileResponseDto;

  @ApiField({ type: "string", description: "Presigned PUT URL to upload the file directly to storage" })
  uploadUrl!: string;
}

// file: apps\playground-api\src\files\file.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "A persisted file record",
})
export class FileResponseDto {
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
export class FileListResponseDto {
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
export class UploadFileDto {
  @ApiField({ type: "string", format: "binary", description: "The file to upload" })
  file!: Blob;
}

@ApiDto({
  description: "Delete file response",
})
export class DeleteFileResponseDto {
  @ApiField({
    type: "boolean",
    description: "Whether the file was deleted.",
  })
  deleted!: boolean;
}

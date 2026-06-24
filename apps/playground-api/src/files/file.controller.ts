import { Authorize, Controller, Delete, Get, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { requireCurrentUser } from "@genspire/auth";
import {
  DeleteFileResponseDto,
  FileListResponseDto,
  FileResponseDto,
  UploadFileDto,
} from "./file.dto.js";
import { FileService } from "./file.service.js";

@Authorize()
@Controller("/file", {
  tag: "File",
  description: "File upload, download, and listing endpoints backed by object storage",
})
export class FileController {
  static inject = [FileService];

  constructor(private readonly service: FileService) {}

  @Post("/", {
    summary: "Upload a file",
    requestBody: UploadFileDto,
    response: FileResponseDto,
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
      500: {
        description: "Internal server error",
        body: defineProblemDetailsType("Internal server error problem response"),
      },
    },
  })
  async upload(ctx: RequestContext) {
    const currentUser = requireCurrentUser(ctx);

    const contentType = ctx.req.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return problem({
        status: 400,
        title: "Upload requires multipart/form-data",
        detail: "Send the file as a multipart form field named 'file'.",
      });
    }

    let formData: FormData;
    try {
      const raw = await ctx.req.formData();
      formData = raw as unknown as FormData;
    } catch {
      return problem({
        status: 400,
        title: "Invalid multipart form data",
      });
    }

    const fileField = formData.get("file");
    if (!fileField || !(fileField instanceof Blob)) {
      return problem({
        status: 400,
        title: "File is required",
        detail: "Provide a 'file' field with the file contents.",
      });
    }

    const originalName =
      fileField instanceof File
        ? fileField.name || "unnamed"
        : "unnamed";

    const result = await this.service.upload({
      file: fileField,
      originalName,
      bucket: currentUser.id,
      uploadedBy: currentUser.id,
      uploaderIp: ctx.clientIp,
    });
    return json(result, { status: 201 });
  }

  @Get("/", {
    summary: "List files",
    response: FileListResponseDto,
  })
  async list(ctx: RequestContext) {
    const bucket = ctx.query.get("bucket") ?? undefined;
    const prefix = ctx.query.get("prefix") ?? undefined;
    const limitStr = ctx.query.get("limit");
    const cursor = ctx.query.get("cursor") ?? undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    if (limitStr && (isNaN(limit!) || limit! < 1)) {
      return problem({
        status: 400,
        title: "Invalid limit",
        detail: "Limit must be a positive integer.",
      });
    }

    return await this.service.list(bucket, prefix, limit, cursor);
  }

  @Get("/:id", {
    summary: "Download a file by id",
    responses: {
      400: {
        description: "Missing file id",
        body: defineProblemDetailsType("Missing file id problem response"),
      },
      404: {
        description: "File not found",
        body: defineProblemDetailsType("File not found problem response"),
      },
    },
  })
  async download(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({
        status: 400,
        title: "File id is required",
      });
    }

    const result = await this.service.getById(id);

    if (!result) {
      return problem({
        status: 404,
        title: "File not found",
      });
    }

    return new Response(result.stream, {
      headers: {
        "content-type": result.contentType,
        "content-disposition": `inline; filename="${result.entity.originalName}"`,
      },
    });
  }

  @Authorize({ roles: ["admin"] })
  @Delete("/:id", {
    summary: "Delete a file",
    response: DeleteFileResponseDto,
    responses: {
      400: {
        description: "Missing file id",
        body: defineProblemDetailsType("Missing file id problem response"),
      },
      404: {
        description: "File not found",
        body: defineProblemDetailsType("File not found problem response"),
      },
    },
  })
  async deleteById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({
        status: 400,
        title: "File id is required",
      });
    }

    const deleted = await this.service.deleteById(id);

    if (!deleted) {
      return problem({
        status: 404,
        title: "File not found",
      });
    }

    return { deleted: true };
  }
}

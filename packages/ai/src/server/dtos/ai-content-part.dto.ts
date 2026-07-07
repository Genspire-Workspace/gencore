// file: packages/ai/src/server/dtos/ai-content-part.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type {
  AiContentData,
  AiMessageContent,
  IAiFilePart,
  IAiImagePart,
  IAiTextPart,
  IAiThinkingPart,
  IAiToolCallPart,
  IAiToolResultPart,
} from "../../domain/messages/ai-content-part.js";

@ApiDto({ description: "AI text content part" })
export class AiTextPartDto implements IAiTextPart {
  @ApiField({ type: "string", enum: ["text"] })
  type!: "text";

  @ApiField({ type: "string" })
  text!: string;
}

@ApiDto({ description: "AI image content part" })
export class AiImagePartDto implements IAiImagePart {
  @ApiField({ type: "string", enum: ["image"] })
  type!: "image";

  @ApiField({ type: "string", description: "Image data as URL or base64-encoded string" })
  data!: AiContentData;

  @ApiField({ type: "string", description: "IANA media type, e.g. image/png" })
  mediaType!: string;
}

@ApiDto({ description: "AI file content part" })
export class AiFilePartDto implements IAiFilePart {
  @ApiField({ type: "string", enum: ["file"] })
  type!: "file";

  @ApiField({ type: "string", description: "File data as URL or base64-encoded string" })
  data!: AiContentData;

  @ApiField({ type: "string", description: "IANA media type, e.g. application/pdf" })
  mediaType!: string;

  @ApiField({ type: "string", required: false })
  filename?: string;
}

@ApiDto({ description: "AI tool call content part" })
export class AiToolCallPartDto implements IAiToolCallPart {
  @ApiField({ type: "string", enum: ["tool_call"] })
  type!: "tool_call";

  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "object", description: "Tool call arguments as a JSON object" })
  arguments!: Record<string, unknown>;
}

@ApiDto({ description: "AI tool result content part" })
export class AiToolResultPartDto implements IAiToolResultPart {
  @ApiField({ type: "string", enum: ["tool_result"] })
  type!: "tool_result";

  @ApiField({ type: "string" })
  toolCallId!: string;

  @ApiField({ type: "object", description: "Tool result content as text or content parts" })
  content!: AiMessageContent;
}

@ApiDto({ description: "AI thinking / reasoning content part" })
export class AiThinkingPartDto implements IAiThinkingPart {
  @ApiField({ type: "string", enum: ["thinking"] })
  type!: "thinking";

  @ApiField({ type: "string" })
  text!: string;

  @ApiField({ type: "string", required: false })
  signature?: string;

  @ApiField({ type: "boolean", required: false })
  redacted?: boolean;
}
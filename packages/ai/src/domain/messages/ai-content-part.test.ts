// file: packages/ai/src/domain/messages/ai-content-part.test.ts

import { describe, expect, test } from "bun:test";
import { isAiContentPartType } from "./ai-content-part.js";
import type {
  AiContentPart,
  AiContentPartType,
  IAiDataPart,
  IAiFilePart,
} from "./ai-content-part.js";

describe("AiContentPartType", () => {
  test("isAiContentPartType recognizes every valid part kind", () => {
    const valid: AiContentPartType[] = [
      "text",
      "image",
      "tool_call",
      "tool_result",
      "thinking",
      "file",
    ];

    for (const kind of valid) {
      expect(isAiContentPartType(kind)).toBe(true);
    }
  });

  test("isAiContentPartType rejects unknown kinds", () => {
    expect(isAiContentPartType("audio")).toBe(false);
    expect(isAiContentPartType(undefined)).toBe(false);
    expect(isAiContentPartType(null)).toBe(false);
    expect(isAiContentPartType(123)).toBe(false);
  });

  test("image and file parts share the IAiDataPart base (data + mediaType)", () => {
    const image: AiContentPart = {
      type: "image",
      mediaType: "image/png",
      data: new Uint8Array([1, 2, 3]),
    };

    const file: AiContentPart = {
      type: "file",
      mediaType: "application/pdf",
      data: Buffer.from("%PDF-1.4"),
      filename: "example.pdf",
    };

    if (image.type === "image") {
      const dataPart: IAiDataPart = image;
      expect(dataPart.mediaType).toBe("image/png");
      expect(image.data).toBeInstanceOf(Uint8Array);
    } else {
      throw new Error("image part did not narrow");
    }

    if (file.type === "file") {
      const filePart: IAiFilePart = file;
      const dataPart: IAiDataPart = filePart;
      expect(filePart.filename).toBe("example.pdf");
      expect(dataPart.mediaType).toBe("application/pdf");
    } else {
      throw new Error("file part did not narrow");
    }
  });
});
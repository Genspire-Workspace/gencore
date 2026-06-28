// file: apps/playground-app-ai/src/ai/verify-ai.ts

import type { GenApp } from "@genspire/core";
import type {
  AiMessageContent,
  IAiImagePart,
} from "../../../../packages/ai/src/domain/messages/index.js";
import { createDefaultImagePart } from "../verify/shared/images.js";
import { AiGenerationService } from "../../../../packages/ai/src/application/services/generation/ai-generation-service.js";

export interface AiVerificationResult {
  chatReply: string;
  streamDeltas: string[];
  visionReply: string;
  embeddingDimensions: number;
}

export interface AiVerificationOptions {
  skipEmbedding?: boolean;
  skipVision?: boolean;
  image?: IAiImagePart;
}

function extractText(content: AiMessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export async function runAiVerification(
  app: GenApp,
  options: AiVerificationOptions = {},
): Promise<AiVerificationResult> {
  const ai = app.get(AiGenerationService);

  const chat = await ai.generateChat({
    messages: [{ role: "user", content: "Say hello in one word." }],
  });

  const chatReply = extractText(chat.message.content);

  if (!chatReply) {
    throw new Error("AI verification failed: chat generation returned no text.");
  }

  const streamDeltas: string[] = [];

  for await (const chunk of ai.streamChat({
    messages: [{ role: "user", content: "Stream the word hello." }],
  })) {
    if (chunk.delta) {
      streamDeltas.push(chunk.delta);
    }
  }

  if (streamDeltas.length === 0) {
    throw new Error("AI verification failed: chat stream produced no deltas.");
  }

  let visionReply = "";

  if (!options.skipVision) {
    const image = options.image ?? createDefaultImagePart();

    const vision = await ai.generateChat({
      messages: [
        {
          role: "user",
          content: [
            { type: "image", data: image.data, mediaType: image.mediaType },
            {
              type: "text",
              text: "What is the dominant color of this image? Answer with one word.",
            },
          ],
        },
      ],
    });

    visionReply = extractText(vision.message.content);

    if (!visionReply) {
      throw new Error("AI verification failed: vision returned no text.");
    }
  }

  let embeddingDimensions = 0;

  if (!options.skipEmbedding) {
    const embedding = await ai.generateEmbedding({
      input: "hello world",
    });

    embeddingDimensions = embedding.embeddings[0]?.embedding.length ?? 0;

    if (embeddingDimensions === 0) {
      throw new Error("AI verification failed: embedding produced no vector.");
    }
  }

  return { chatReply, streamDeltas, visionReply, embeddingDimensions };
}
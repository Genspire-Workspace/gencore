// file: packages/ai/src/domain/tools/ai-tool-choice.ts

export type AiToolChoice =
  | "auto"
  | "none"
  | "required"
  | {
      type: "tool";
      name: string;
    };

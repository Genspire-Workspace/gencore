// file: packages\ai\src\tools\ai-tool-choice.ts

export type AiToolChoice =
  | "auto"
  | "none"
  | "required"
  | {
      type: "tool";
      name: string;
    };

// file: packages/ai/src/application/prompts/ai-prompt-registry.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiPrompt } from "../../domain/prompts/ai-prompt.js";

export class AiPromptRegistry {
  private readonly prompts = new Map<string, IAiPrompt>();

  constructor(prompts?: readonly IAiPrompt[]) {
    for (const prompt of prompts ?? []) {
      this.register(prompt);
    }
  }

  register(prompt: IAiPrompt): void {
    if (this.prompts.has(prompt.id)) {
      throw new AiError(`AI prompt '${prompt.id}' is already registered.`);
    }

    this.prompts.set(prompt.id, prompt);
  }

  upsert(prompt: IAiPrompt): void {
    this.prompts.set(prompt.id, prompt);
  }

  unregister(id: string): void {
    this.prompts.delete(id);
  }

  get(id: string): IAiPrompt {
    const prompt = this.prompts.get(id);

    if (!prompt) {
      throw new AiError(`AI prompt '${id}' is not registered.`);
    }

    return prompt;
  }

  tryGet(id: string): IAiPrompt | undefined {
    return this.prompts.get(id);
  }

  has(id: string): boolean {
    return this.prompts.has(id);
  }

  list(): readonly IAiPrompt[] {
    return [...this.prompts.values()];
  }

  clear(): void {
    this.prompts.clear();
  }
}

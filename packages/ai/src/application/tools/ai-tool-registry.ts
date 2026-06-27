// file: packages/ai/src/application/tools/ai-tool-registry.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";

export class AiToolRegistry {
  private readonly tools = new Map<string, IAiTool>();

  constructor(tools?: readonly IAiTool[]) {
    for (const tool of tools ?? []) {
      this.register(tool);
    }
  }

  register(tool: IAiTool): void {
    if (this.tools.has(tool.name)) {
      throw new AiError(`AI tool '${tool.name}' is already registered.`);
    }

    this.tools.set(tool.name, tool);
  }

  upsert(tool: IAiTool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): IAiTool {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new AiError(`AI tool '${name}' is not registered.`);
    }

    return tool;
  }

  tryGet(name: string): IAiTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): readonly IAiTool[] {
    return [...this.tools.values()];
  }

  clear(): void {
    this.tools.clear();
  }
}

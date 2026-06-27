// file: packages/ai/src/application/tools/ai-tool-resolver.ts

import { AiError } from "../../errors/ai-error.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import type { AiToolRegistry } from "./ai-tool-registry.js";

export interface IAiToolResolverInput {
  tools?: readonly IAiTool[];
  toolNames?: readonly string[];
  registry?: AiToolRegistry;
}

export class AiToolResolver {
  resolve(input: IAiToolResolverInput): IAiTool[] {
    const resolved = new Map<string, IAiTool>();

    for (const name of input.toolNames ?? []) {
      const tool = input.registry?.tryGet(name);

      if (!tool) {
        throw new AiError(`AI tool '${name}' could not be resolved.`);
      }

      resolved.set(tool.name, tool);
    }

    for (const tool of input.tools ?? []) {
      resolved.set(tool.name, tool);
    }

    return [...resolved.values()];
  }
}

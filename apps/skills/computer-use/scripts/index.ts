// file: apps\skills\computer-use\scripts\index.ts

import type { IAiTool } from "../../../../packages/ai/src/domain/tools/ai-tool.js";
import { bashTool } from "./bash.js";
import { listTool } from "./list.js";
import { readTool } from "./read.js";

export { bashTool } from "./bash.js";
export { listTool } from "./list.js";
export { readTool } from "./read.js";

export const computerUseTools: readonly IAiTool[] = [
  bashTool,
  readTool,
  listTool,
];

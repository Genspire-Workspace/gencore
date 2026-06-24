// file: packages\core\src\app\create-app.ts

import type { GenAppOptions } from "./gen-app-options.js";
import { GenApp } from "./gen-app.js";

export function createApp(options?: GenAppOptions): GenApp {
  return new GenApp(options);
}

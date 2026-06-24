// file: packages\core\src\app\create-app.ts

import type { IGenAppOptions } from "./gen-app-options.js";
import { GenApp } from "./gen-app.js";

export function createApp(options?: IGenAppOptions): GenApp {
  return new GenApp(options);
}

// file: packages\core\src\app\gen-app-options.ts

import type { IGenExtension } from "./gen-extension.js";

export interface IGenAppOptions {
  extensions?: readonly IGenExtension[];
}

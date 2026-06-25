// file: packages\ai\src\models\ai-model.ts

import type { IAiModelCapabilities } from "./ai-model-capabilities.js";

export interface IAiModel {
  id: string;
  displayName: string;
  providerId: string;
  capabilities?: IAiModelCapabilities;
}

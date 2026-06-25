import { AiModelRegistry } from "../ai-model-registry.js";
import { AI_PROVIDERS } from "./providers.generated.js";
import { AI_MODELS } from "./models.generated.js";
import { AI_MODEL_ENDPOINTS } from "./endpoints.generated.js";

export const defaultAiModelRegistry = new AiModelRegistry({
  providers: AI_PROVIDERS,
  models: AI_MODELS,
  endpoints: AI_MODEL_ENDPOINTS,
});

export {
  AI_PROVIDERS,
  AI_MODELS,
  AI_MODEL_ENDPOINTS,
};

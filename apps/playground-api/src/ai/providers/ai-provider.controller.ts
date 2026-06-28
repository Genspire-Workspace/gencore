// file: apps\playground-api\src\ai\providers\ai-provider.controller.ts

import { AllowAnonymous, Controller, Get } from "@genspire/server";
import { aiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import { AiProvidersResponseDto } from "./ai-provider.dto.js";

@Controller("/ai", {
  tag: "AI",
  description: "AI provider discovery endpoints",
})
export class AiProviderController {
  @AllowAnonymous()
  @Get("/providers", {
    summary: "List configured AI providers",
    response: AiProvidersResponseDto,
  })
  getProviders() {
    return {
      providers: aiPlaygroundRuntime.providers,
      defaults: aiPlaygroundRuntime.resolver.getDefaults(),
    };
  }
}

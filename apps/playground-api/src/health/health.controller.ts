// file: apps\playground-api\src\health\health.controller.ts

import { Controller, Get } from "@genspire/server";
import { HealthResponse } from "./health.dto.js";

@Controller("/health", {
  tag: "Health",
  description: "Health check endpoints",
})
export class HealthController {
  @Get("/", {
    summary: "Health check",
    response: HealthResponse,
  })
  getHealth() {
    return { ok: true };
  }
}

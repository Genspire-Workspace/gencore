import { Controller, Get } from "@genspire/server";

@Controller("/health", {
  tag: "Health",
  description: "Health check endpoints",
})
export class HealthController {
  @Get("/", {
    summary: "Health check",
    response: class HealthResponse {
      ok!: boolean;
    },
  })
  getHealth() {
    return { ok: true };
  }
}

import type { AiClientKind } from "../src/clients/ai-client-kind.js";
import { fetchModelsDev } from "./models-dev/fetch-models-dev.js";
import { normalizeModelsDev } from "./models-dev/normalize-models-dev.js";
import { writeGeneratedCatalogue } from "./models-dev/write-generated.js";

async function main(): Promise<void> {
  console.log("Fetching models.dev catalogue...");

  const raw = await fetchModelsDev();
  const catalogue = normalizeModelsDev(raw);

  if (
    Object.keys(catalogue.providers).length === 0 &&
    Object.keys(catalogue.models).length === 0
  ) {
    throw new Error("models.dev catalogue generation failed: no providers or models were produced.");
  }

  await writeGeneratedCatalogue(catalogue);
  printStats(catalogue);
}

function printStats(catalogue: ReturnType<typeof normalizeModelsDev>): void {
  const models = Object.values(catalogue.models);
  const providers = Object.values(catalogue.providers);
  const clientKinds: AiClientKind[] = [
    "openai-compatible",
    "openai",
    "anthropic",
    "google",
    "amazon-bedrock",
    "ollama",
    "custom",
  ];

  console.log(`Generated providers: ${providers.length}`);
  console.log(`Generated models: ${models.length}`);
  console.log(`Generated labs: ${Object.keys(catalogue.labs).length}`);
  console.log(`Reasoning models: ${models.filter((model) => model.reasoning).length}`);
  console.log(`Tool-call models: ${models.filter((model) => model.tool_call).length}`);
  console.log(`Structured-output models: ${models.filter((model) => model.structured_output).length}`);
  console.log(`Open-weight models: ${models.filter((model) => model.open_weights).length}`);
  console.log(`Attachment-capable models: ${models.filter((model) => model.attachment).length}`);
  console.log("Providers by client kind:");

  for (const clientKind of clientKinds) {
    console.log(`  ${clientKind}: ${providers.filter((provider) => provider.clientKind === clientKind).length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// file: packages\ai\scripts\models-dev\fetch-models-dev.ts

import { fetchJson } from "./utils.js";

export interface IModelsDevFetchResult {
  api?: unknown;
  models?: unknown;
  catalog?: unknown;
}

export async function fetchModelsDev(): Promise<IModelsDevFetchResult> {
  const [api, models, catalog] = await Promise.allSettled([
    fetchJson("https://models.dev/api.json"),
    fetchJson("https://models.dev/models.json"),
    fetchJson("https://models.dev/catalog.json"),
  ]);

  return {
    api: api.status === "fulfilled" ? api.value : undefined,
    models: models.status === "fulfilled" ? models.value : undefined,
    catalog: catalog.status === "fulfilled" ? catalog.value : undefined,
  };
}

// file: packages\data-mikroorm\src\context\mikro-orm-request-context.ts

import { RequestContext } from "@mikro-orm/core";
import { MikroOrmService } from "../extension/mikro-orm-extension.js";

export async function runInMikroOrmRequestContext<T>(
  service: MikroOrmService,
  operation: () => Promise<T>,
): Promise<T> {
  return await RequestContext.create(service.getEntityManager(), operation);
}

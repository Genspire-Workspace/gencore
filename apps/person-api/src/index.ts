import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import { MikroOrmService, mikroOrmExtension } from "@genspire/data-mikroorm";
import { serverExtension, Server } from "@genspire/server";
import { createPersonApiMikroOrmConfig } from "./database/mikro-orm-person-config.js";
import { registerPersonRoutes } from "./routes/person.routes.js";

const app = createApp();

await app.use(
  dataExtension({
    runSeedersOnStart: false,
  }),
);

await app.use(mikroOrmExtension(await createPersonApiMikroOrmConfig()));

await app.use({
  name: "person-api-schema",
  dependsOn: ["data-mikroorm"],
  async start(currentApp) {
    // Example-only schema sync for local development. Production should use migrations.
    await currentApp.get(MikroOrmService).getOrm().schema.update();
  },
});

await app.use(
  serverExtension({
    port: 3001,
  }),
);

registerPersonRoutes(app.get(Server), app);

await app.start();

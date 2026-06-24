import { createApp } from "@genspire/core";
import { serverExtension, Server } from "@genspire/server";

const app = createApp();

await app.use(
  serverExtension({
    port: 3000,
  }),
);

const server = app.get(Server);

server.get("/health", () => ({ ok: true }));

server.get("/hello/:name", (ctx) => ({
  message: `Hello ${ctx.params.name}`,
}));

server.group("/api/v1/projects", (routes) => {
  routes.get("/", () => [{ id: "demo", name: "Demo Project" }]);
  routes.post("/", async (ctx) => ({
    created: true,
    body: await ctx.req.json(),
  }));
});

await app.start();

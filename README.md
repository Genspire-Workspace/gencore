<!-- file: README.md -->

# GenCore

GenCore is a Bun-first TypeScript framework for building modular server applications with a small application kernel, an HTTP server layer, optional OpenAPI delivery, and optional data adapters.

The current architecture is:

- `@genspire/core`: application kernel only
- `@genspire/server`: HTTP server, controllers, routing, request context, OpenAPI metadata primitives
- `@genspire/swagger`: Swagger/OpenAPI delivery extension
- `@genspire/data`: framework-agnostic data contracts and lifecycle
- `@genspire/data-mikroorm`: MikroORM adapter for libSQL and PostgreSQL

## Design Rules

- Keep `@genspire/core` small. It must not know about HTTP, Bun servers, controllers, Swagger, SQL, ORMs, storage, auth, AI, or Redis.
- Put HTTP concerns in `@genspire/server`.
- Put OpenAPI metadata and schema-building primitives in `@genspire/server/src/openapi`.
- Keep `@genspire/swagger` as the extension/UI layer only.
- Keep `@genspire/data` framework-agnostic and ORM-agnostic.
- Put MikroORM-specific behavior in `@genspire/data-mikroorm`.

## Packages

### `@genspire/core`

Use this for:

- `createApp()`
- `GenApp` and `GenExtension`
- dependency injection and service lifetimes
- scoped resolution
- lifecycle hooks
- logging
- events
- config/env access
- result/error helpers

Example:

```ts
import { createApp, LoggerFactory } from "@genspire/core";

const app = createApp();
const logger = app.get(LoggerFactory).createLogger("Demo");

logger.info("core works");

await app.start();
await app.stop();
```

### `@genspire/server`

Use this for:

- `serverExtension()`
- `Server`
- function-first routes
- controllers and HTTP decorators
- request context helpers
- response helpers
- OpenAPI DTO decorators and schema/document builders

Example:

```ts
import { createApp } from "@genspire/core";
import { serverExtension, Server } from "@genspire/server";

const app = createApp();

await app.use(serverExtension({ port: 3000 }));

const server = app.get(Server);

server.get("/health", () => ({ ok: true }));

await app.start();
```

### `@genspire/swagger`

Use this only when you want to expose the OpenAPI document and Swagger UI over HTTP.
OpenAPI metadata and document generation live in @genspire/server.

Example:

```ts
import { swaggerExtension } from "@genspire/swagger";

await app.use(
  swaggerExtension({
    title: "My API",
    version: "0.1.0",
  }),
);
```

### `@genspire/data`

Use this for:

- data source lifecycle
- seeders
- generic entity/repository/page contracts

### `@genspire/data-mikroorm`

Use this for:

- `mikroOrmExtension()`
- `MikroOrmService`
- `EntityManagerProvider`
- libSQL or PostgreSQL-backed MikroORM integration

## Building an API

The recommended stack for a documented SQL-backed API is:

1. Create the app with `createApp()`
2. Register `dataExtension()`
3. Register `mikroOrmExtension(...)`
4. Register any schema-sync or migration bootstrap extension
5. Register `serverExtension(...)`
6. Register `swaggerExtension(...)` if needed
7. Register controllers on `Server`
8. Start the app

Example:

```ts
import { createApp } from "@genspire/core";
import { dataExtension } from "@genspire/data";
import { mikroOrmExtension } from "@genspire/data-mikroorm";
import { serverExtension, Server } from "@genspire/server";
import { swaggerExtension } from "@genspire/swagger";

const app = createApp();

await app.use(dataExtension());
await app.use(mikroOrmExtension({ runtimeDriver: "libsql", entities: [], dbName: "app.db" }));
await app.use(serverExtension({ port: 3000 }));
await app.use(swaggerExtension());

const server = app.get(Server);

await app.start();
```

## Function-First Routes

`@genspire/server` supports direct route registration:

```ts
server.get("/health", () => ({ ok: true }));

server.post("/projects", async (ctx) => {
  const body = await ctx.json<{ name: string }>();
  return { created: true, body };
});

server.group("/api/v1/projects", (routes) => {
  routes.get("/", () => []);
  routes.post("/", async (ctx) => await ctx.json());
});
```

Handlers may return:

- `Response`
- plain objects
- strings
- promises of those values

## Controllers

For documented APIs, prefer controllers plus DTOs.

Available decorators from `@genspire/server`:

- `@Controller()`
- `@Get()`
- `@Post()`
- `@Put()`
- `@Patch()`
- `@Delete()`

Example:

```ts
import { Controller, Get, Post, RequestContext, json } from "@genspire/server";

@Controller("/todo", {
  tag: "Todo",
  description: "Todo endpoints",
})
export class TodoController {
  @Get("/", {
    summary: "List todos",
  })
  async list() {
    return { items: [] };
  }

  @Post("/", {
    summary: "Create todo",
  })
  async create(ctx: RequestContext) {
    return json(await ctx.json(), { status: 201 });
  }
}
```

Register them through the server:

```ts
server.registerControllers(TodoController);
```

Controllers resolve through request-scoped DI.

## OpenAPI Metadata

OpenAPI metadata primitives live in `@genspire/server`, not in `@genspire/swagger`.

Available utilities:

- `@ApiDto()`
- `@ApiField()`
- `apiDtoToTypeDefinition()`
- `apiTypeToOpenApiDefinition()`
- `buildOpenApiDocument()`

DTO example:

```ts
import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "Request payload for creating a todo",
})
export class CreateTodoRequest {
  @ApiField({
    type: "string",
    description: "Todo title",
  })
  title!: string;
}
```

Attach DTOs to controller route docs:

```ts
@Post("/", {
  summary: "Create todo",
  request: CreateTodoRequest,
  response: TodoResponse,
})
```

## Playground API

The main example app is `apps/playground-api`.

It demonstrates:

- controller-based routing
- OpenAPI metadata
- Swagger UI
- MikroORM with libSQL
- repository/service/controller layering

Run it with:

```bash
bun run dev:playground-api
```

Default endpoints:

- `GET /health`
- `GET /todo`
- `GET /todo/:id`
- `POST /todo`
- `PATCH /todo/:id`
- `DELETE /todo/:id`
- `GET /swagger.json`
- `GET /docs`

Default database path:

- `C:\Users\PC\Documents\GitHub\Gencore\data\playground-api.db`

Override it with:

```txt
GENCORE_PLAYGROUND_LIBSQL_DB_PATH=...
```

## Person API

`apps/person-api` is a second example focused on a simpler SQL-backed function-first API.

Run it with:

```bash
bun run dev:person-api
```

## Development Commands

Install:

```bash
bun install
```

Run typecheck:

```bash
bunx tsc --noEmit
```

Run tests:

```bash
bun run test
```

Run playground API:

```bash
bun run dev:playground-api
```

Run person API:

```bash
bun run dev:person-api
```

## Current Boundaries

Do not move these into `@genspire/core`:

- controllers
- request/response types
- server/router concepts
- OpenAPI types or DTO decorators
- Swagger delivery
- SQL or ORM integration

Do not move these into `@genspire/swagger`:

- DTO decorators
- OpenAPI schema primitives
- OpenAPI document builders

Those belong in `@genspire/server`.

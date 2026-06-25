<!-- file: README.md -->

# GenCore

GenCore is a Bun-first TypeScript framework for building modular server applications with a small application kernel, an HTTP server layer, optional OpenAPI delivery, and optional data adapters.

The current architecture is:

- `@genspire/core`: application kernel only
- `@genspire/server`: HTTP server, controllers, routing, request context, OpenAPI metadata primitives
- `@genspire/swagger`: Swagger/OpenAPI delivery extension
- `@genspire/data`: framework-agnostic data contracts and lifecycle
- `@genspire/data-mikroorm`: MikroORM adapter for libSQL and PostgreSQL
- `@genspire/auth`: authentication, roles, guards, current user, IP tracking, auth middleware
- `@genspire/storage`: object storage abstraction, local + S3 providers, file management toolkit

## Design Rules

- Keep `@genspire/core` small. It must not know about HTTP, Bun servers, controllers, Swagger, SQL, ORMs, storage, auth, AI, or Redis.
- Put HTTP concerns in `@genspire/server`.
- Put OpenAPI metadata and schema-building primitives in `@genspire/server/src/openapi`.
- Keep `@genspire/swagger` as the extension/UI layer only.
- Keep `@genspire/data` framework-agnostic and ORM-agnostic.
- Put MikroORM-specific behavior in `@genspire/data-mikroorm`.
- All interfaces must use the `I` prefix (e.g., `IEntity`, `IDataSource`, `IPageRequest`).
- All DTO classes must use the `Dto`/`DTO` suffix (e.g., `ListResponseDto`, `PrepareUploadRequestDTO`).
- Type aliases do not require a prefix (e.g., `EntityState`, `SortDirection`).

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

### `@genspire/auth`

Use this for:

- `authExtension()`
- user registration, login, refresh, logout
- bearer token authentication
- role-based authorization
- IP tracking and banning
- password hashing (Argon2)
- `requireCurrentUser(ctx)`, `getCurrentUser(ctx)`

### `@genspire/storage`

Use this for:

- `storageExtension()`
- `StorageService` — bucket/key object storage API
- `LocalStorageProvider` — filesystem-backed with sidecar `.meta.json`
- `S3StorageProvider` — AWS S3 / MinIO compatible with presigned URLs
- `FileEntity` — reusable MikroORM entity for file metadata
- `StorageDbContext` — extendable DbContext with `files` set
- `FileService` — upload, download, list, delete with DB + storage
- `FileController` — REST controller (`POST /file`, `GET /file`, `GET /file/:id`, `DELETE /file/:id`)

## Building an API

The recommended stack for a documented SQL-backed API is:

1. Create the app with `createApp()`
2. Register `dataExtension()`
3. Register `storageExtension(...)` if needed
4. Register `mikroOrmExtension(...)`
5. Register `authExtension(...)` if needed
6. Register any schema-sync or migration bootstrap extension
7. Register `serverExtension(...)`
8. Register `swaggerExtension(...)` if needed
9. Register controllers on `Server`
10. Start the app

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

The main reference app is `apps/playground-api`. It demonstrates the full stack: controllers, Swagger, auth, file storage, and database-backed CRUD.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | Public | Health check |
| `POST` | `/register` | Public | Register a new user |
| `POST` | `/login` | Public | Login, returns access + refresh tokens |
| `POST` | `/refresh` | Public | Rotate refresh token |
| `POST` | `/logout` | Auth | Revoke refresh token |
| `GET` | `/me` | Auth | Get current user profile |
| `GET` | `/todo` | Auth | List todos |
| `GET` | `/todo/:id` | Auth | Get todo by id |
| `POST` | `/todo` | Auth | Create todo |
| `PATCH` | `/todo/:id` | Auth | Update todo |
| `DELETE` | `/todo/:id` | Admin | Delete todo |
| `POST` | `/file` | Auth | Upload file (multipart or presigned JSON) |
| `GET` | `/file` | Auth | List files |
| `GET` | `/file/:id` | Auth | Download file |
| `DELETE` | `/file/:id` | Admin | Delete file |
| `GET` | `/swagger.json` | Public | OpenAPI document |
| `GET` | `/docs` | Public | Swagger UI |

### File Upload Modes

`POST /file` supports two upload strategies:

- **Multipart (local/small files):** Send `multipart/form-data` with a `file` field. The server buffers and stores the file.
- **Presigned URL (S3):** Send `application/json` with `{ "originalName": "photo.png" }`. The server returns a presigned PUT URL. Upload the file directly to S3/MinIO — it never touches the server.

### Running Modes

The playground supports two infrastructure configurations controlled entirely by environment variables.

#### Local Mode (libSQL + local filesystem)

Copy `.env.local.example` to `.env` and run:

```bash
cp .env.local.example .env
bun run dev:playground-api
```

Key env settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `GENCORE_PLAYGROUND_DATABASE_PROVIDER` | `libsql` | SQLite-compatible via libSQL |
| `GENCORE_PLAYGROUND_STORAGE_PROVIDER` | `local` | Filesystem storage under `./data/storage` |
| `GENCORE_PLAYGROUND_SCHEMA_MODE` | `update` | Auto-create/update tables on start |

Files are stored at `data/storage/{bucket}/{key}` with companion `.meta.json` sidecar files.

#### Docker Mode (PostgreSQL + MinIO/S3)

Requires Docker. Copy `.env.local.docker.example` to `.env` and run:

```bash
cp .env.local.docker.example .env
docker compose -f docker-compose.example.yml up -d
bun run dev:playground-api
```

Key env settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `GENCORE_PLAYGROUND_DATABASE_PROVIDER` | `postgres` | PostgreSQL 16 |
| `GENCORE_PLAYGROUND_POSTGRES_URL` | `postgresql://gencore:gencore@localhost:5432/gencore_playground` | Connection string |
| `GENCORE_PLAYGROUND_STORAGE_PROVIDER` | `s3` | S3-compatible (MinIO) |
| `GENCORE_PLAYGROUND_STORAGE_S3_ENDPOINT` | `http://localhost:9000` | MinIO API |
| `GENCORE_PLAYGROUND_STORAGE_S3_DEFAULT_BUCKET` | `playground` | Bucket name |
| `GENCORE_PLAYGROUND_SCHEMA_MODE` | `update` | Auto-create/update tables on start |

Docker services:

| Service | Ports | Description |
|---------|-------|-------------|
| `postgres` | `5432` | PostgreSQL 16 |
| `minio` | `9000` (API), `9001` (Console) | S3-compatible object storage |
| `minio-init` | — | Creates the `playground` bucket |

MinIO console: http://localhost:9001 (user: `gencore`, password: `gencore-secret`)

### Auth and Seeding

Both modes seed roles and a default admin user on first start. Controlled by env:

| Variable | Description |
|----------|-------------|
| `GENCORE_PLAYGROUND_SEED_ENABLED` | Enable/disable all seeding (`true`) |
| `GENCORE_PLAYGROUND_SEED_ROLES` | Role definitions: `name:desc;name:desc` |
| `GENCORE_PLAYGROUND_SEED_ADMIN_ENABLED` | Create admin user (`true`) |
| `GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL` | Admin email |
| `GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD` | Admin password |
| `GENCORE_PLAYGROUND_SEED_ADMIN_ROLES` | Comma-separated roles to assign |

Default admin: `admin@example.com` / `change-me-admin-password` (change these in production).

### `.env.local` vs `.env.local.docker`

| Concern | Local | Docker |
|---------|-------|--------|
| Database | libSQL (file: `data/playground/playground.db`) | PostgreSQL 16 |
| Storage | Local filesystem (`data/storage/`) | MinIO S3-compatible (`playground` bucket) |
| Schema | `update` (auto DDL) | `update` (auto DDL) |
| Infrastructure | None required | Docker Compose with 3 services |
| Presigned URLs | Not supported (direct upload) | Supported |
| File server overhead | Buffers file in memory | File never touches server |
| Best for | Quick local dev, single dev | Team dev, production-like setup |

## Development Commands

Install:

```bash
bun install
```

Run typecheck:

```bash
bun run typecheck
```

Run tests:

```bash
bun run test
```

Run playground API:

```bash
bun run dev:playground-api
```

Database migrations (playground):

```bash
bun run db:playground:create   # create a new migration
bun run db:playground:up       # apply pending migrations
bun run db:playground:down     # rollback last migration
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

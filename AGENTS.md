<!-- file: AGENTS.md -->

# Agent Instructions

## Package Manager

Use Bun for this repository.

* Use `bun <file>` instead of `node <file>` or `ts-node <file>`.
* Use `bun test` instead of `jest` or `vitest`.
* Use `bun run <script>` instead of `npm run <script>`, `yarn run <script>`, or `pnpm run <script>`.
* Use `bun install` instead of `npm install`, `yarn install`, or `pnpm install`.
* Use `bunx <package> <command>` instead of `npx <package> <command>`.
* Bun automatically loads `.env`, so do not add `dotenv` unless there is an existing project-specific reason.

Prefer Bun-native APIs in new code when they fit the repo:

* `Bun.serve()` instead of Express for new Bun servers.
* `bun:sqlite` instead of `better-sqlite3`.
* `Bun.redis` instead of `ioredis`.
* `Bun.sql` instead of `pg` or `postgres.js`.
* Built-in `WebSocket` instead of `ws`.
* `Bun.file` where it is a clean fit for file reads/writes.
* `Bun.$` where shell execution is needed in Bun scripts.

## Generated CLI Template

Do not edit files under `packages/cli/template/**` directly.

That directory is synced by script and local edits there will be overwritten. When a change needs to affect the generated CLI template:

* Edit the source template package, usually under `packages/templates/**`, or the relevant source package that is vendored into the CLI template.
* Then run `bun run sync:cli-template` from the repository root.
* Review the generated changes under `packages/cli/template/**` only as build output.

## Naming Conventions

* All interfaces must use the `I` prefix (e.g., `IEntity`, `IDataSource`, `IPageRequest`).
* All DTO classes must use the `Dto` suffix (e.g., `ListResponseDto`, `CreateTodoRequestDto`).
* Type aliases (not interfaces) do not require a prefix (e.g., `EntityState`, `SortDirection`).

## Repository Practices

Do not edit files under `packages/cli/template/**` directly.
Do not edit files under `pi-mono/**` directly.

* Keep edits scoped to the requested behavior.
* Preserve existing patterns before introducing new abstractions.
* Prefer `rg` for searching.
* Before changing generated or vendored-looking files, check whether a sync/build script owns them.
* Do not revert unrelated user changes in the working tree.

## GenCore Architecture

When working in this repository, preserve these boundaries:

* `@genspire/core` is the application kernel only.
* `@genspire/server` owns HTTP server concerns, controllers, routing, request context, response helpers, and OpenAPI metadata/building primitives.
* `@genspire/swagger` is only the Swagger/OpenAPI delivery extension and UI layer.
* `@genspire/data` is framework-agnostic and ORM-agnostic.
* `@genspire/data-mikroorm` owns MikroORM integration.

Do not move these into `@genspire/core`:

* `Server`
* `Router`
* controllers or controller decorators
* request/response types
* OpenAPI schema types
* `ApiDto` / `ApiField`
* Swagger concerns
* MikroORM, SQL, libSQL, PostgreSQL, repositories, or data source logic

Do not move these into `@genspire/swagger`:

* OpenAPI DTO decorators
* OpenAPI schema primitives
* OpenAPI document builders

Those belong in `packages/server/src/openapi/**`.

## Package Module Structure

When creating or reorganizing feature packages, prefer the following package-internal order:

```txt
packages/<name>/src
├─ domain/
├─ application/
├─ infrastructure/
├─ server/
├─ extension/
├─ index.ts
├─ domain.ts
├─ application.ts
├─ infrastructure.ts
└─ server.ts
```

Not every package needs every folder. Add folders only when that package has the corresponding responsibility.

Use this meaning:

* `domain/` contains the package's core domain concepts: entities, value types, domain types, domain events, and pure model contracts.
* `application/` contains use cases, services, application contracts, validation/business rules, configuration objects, and package-level runtime behavior.
* `infrastructure/` contains technical implementations such as persistence contexts, ORM-specific code, provider adapters, storage adapters, token implementations, and other replaceable integrations.
* `server/` contains server-facing adapters: controllers, DTOs, middleware, route registration, request-context helpers, authorization helpers, and API-specific mapping.
* `extension/` contains GenCore extension wiring when it does not clearly belong to one layer.

Prefer this structure over grouping by file kind at package root:

```txt
src/controllers
src/services
src/entities
src/dtos
src/types
```

For feature packages with server endpoints, keep the MVC/server-facing items under `src/server/**`.

For example:

```txt
packages/auth/src
├─ domain/
│  ├─ entities/
│  └─ types/
├─ application/
│  ├─ services/
│  ├─ contracts/
│  └─ hashing/
├─ infrastructure/
│  └─ persistence/
├─ server/
│  ├─ controllers/
│  ├─ dtos/
│  ├─ middleware/
│  └─ auth-server-extension.ts
├─ extension/
│  └─ auth-extension.ts
└─ index.ts
```

### Package Layering Rules

Follow this dependency direction:

```txt
server -> application -> domain
infrastructure -> application/domain
extension -> the layers it wires
```

Avoid dependencies in the opposite direction:

* `domain/` must not import from `server/`.
* `domain/` must not depend on request/response types.
* `application/` must not depend on server DTOs, controllers, request contexts, or response helpers.
* `application/` services should use application contracts, not server DTOs.
* `server/` maps DTOs/request data into application inputs and maps application results into DTOs/responses.
* `infrastructure/` should not leak ORM/provider-specific details into controllers unless the package intentionally exposes them.

### Service Inputs vs DTOs

Do not pass server DTOs directly into application services.

Prefer:

```ts
// application/contracts/login-input.ts
export interface ILoginInput {
  email: string;
  password: string;
  metadata?: IAuthRequestMetadata;
}
```

and:

```ts
// server/controllers/auth.controller.ts
const body = await ctx.json<LoginRequestDto>();

const result = await this.authService.login({
  email: body.email,
  password: body.password,
  metadata: getAuthRequestMetadata(ctx),
});
```

Avoid:

```ts
authService.login(body as LoginRequestDto);
```

DTOs are transport/API contracts. Application contracts are service/use-case contracts.

### Server Folder Rules

Use `server/`, not `http/`, for package-local MVC/API adapters.

The `server/` folder may contain:

* controllers
* DTOs
* middleware
* request metadata helpers
* current-user helpers based on `RequestContext`
* route registration helpers
* server-specific extension files
* OpenAPI-facing DTO metadata

The `server/` folder must not contain:

* core business logic
* persistence implementation
* ORM setup
* domain entities
* application services

### Extension Rules

Split extensions when a package has both runtime behavior and default server endpoints.

Prefer:

```ts
authExtension(...)
authServerExtension(...)
```

Where:

* `authExtension(...)` registers core/application/infrastructure services.
* `authServerExtension(...)` registers controllers, middleware, route prefixes, and server-facing behavior.

Apps should explicitly choose what they mount:

```ts
app.use(authExtension(...));
app.use(authServerExtension({ routePrefix: "/api/v1/auth" }));
```

Do not make default server endpoints appear implicitly unless that is already the package's established behavior.

### Package Exports

Use subpath exports to make package boundaries explicit.

Prefer package exports like:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./domain": "./src/domain.ts",
    "./application": "./src/application.ts",
    "./infrastructure": "./src/infrastructure.ts",
    "./server": "./src/server.ts"
  }
}
```

Root exports should expose the stable intended public API.

Avoid exporting every internal file from root just because it exists.

## API Creation Rules

When creating or modifying APIs in this repo, follow these patterns unless the user explicitly asks otherwise.

### App Composition

For a documented SQL-backed API, prefer this extension order:

1. `dataExtension()`
2. `mikroOrmExtension(...)`
3. any local schema/migration bootstrap extension
4. package runtime extensions such as `authExtension(...)`, `storageExtension(...)`, or `aiExtension(...)`
5. `serverExtension(...)`
6. package server extensions such as `authServerExtension(...)`, `storageServerExtension(...)`, or `aiServerExtension(...)`
7. app-local controllers
8. `swaggerExtension(...)`

Register controllers only after the server extension is available.

### Package Composition

When a feature package exposes default APIs, split runtime registration from server registration.

Prefer:

```ts
app.use(featureExtension(...));
app.use(featureServerExtension(...));
```

The runtime extension should register:

* configuration
* services
* repositories or persistence contexts
* provider/adapters
* domain/application infrastructure

The server extension should register:

* controllers
* middleware
* route prefixes
* request/response adapters
* server-specific authorization behavior

### Routing Style

Prefer:

* function-first routes for simple endpoints or low-level examples
* controller classes for documented app APIs and reusable package APIs

Use `server.registerController()` or `server.registerControllers()` for controller-based APIs.

### Controllers

Controller decorators belong in `@genspire/server`.

Use:

* `@Controller()`
* `@Get()`
* `@Post()`
* `@Put()`
* `@Patch()`
* `@Delete()`

Controllers should:

* stay thin
* read request data from `RequestContext`
* map DTOs/request data into application inputs
* delegate business logic to services
* return normalized values or response helpers from `@genspire/server`

Controllers should not:

* contain persistence logic
* contain business workflows
* directly construct ORM queries when a service/repository exists
* pass transport DTOs into application services when an application contract should exist

### DTOs and OpenAPI Metadata

For documented APIs, import DTO/OpenAPI decorators from `@genspire/server`, not `@genspire/swagger`.

Use:

* `ApiDto`
* `ApiField`
* route `request`, `requestBody`, `query`, and `response` docs

Prefer explicit DTOs over ad hoc anonymous objects when a route is part of a documented API.

DTOs should live in:

```txt
packages/<name>/src/server/dtos/**
```

for reusable package APIs, or:

```txt
apps/<app>/src/**/dtos/**
```

for app-specific APIs.

### Service, Repository, and Entity Layering

For data-backed APIs, prefer:

* controller
* application service
* repository or DB context
* entity

Rules:

* controllers handle server/API concerns only
* services handle validation and business rules
* repositories or DB contexts handle persistence
* IDs are generated on the backend, not in clients
* entities belong to `domain/entities` or the package's established entity location
* ORM-specific persistence wiring belongs under `infrastructure/`

### MikroORM Usage

When using MikroORM in this repo:

* use `EntityManagerProvider`
* prefer `fork()` for request work
* keep ORM wiring in `@genspire/data-mikroorm`
* do not couple MikroORM directly into `@genspire/server`

For local/playground apps, schema update on startup is acceptable with a comment that production should use migrations.

### Swagger

`@genspire/swagger` should only:

* register `/swagger.json`
* register `/docs`
* render Swagger UI

If a task asks for OpenAPI schema generation changes, first consider whether the change belongs in:

* `packages/server/src/openapi/**`

not in `packages/swagger/**`.

## SDK Rules

SDK packages belong under `packages/`, not at the repository root.

Use:

```txt
packages/sdk
```

not:

```txt
sdk
```

The SDK consumes a running server API over HTTP/streaming. It must not directly import package controllers, services, entities, or database contexts.

Correct dependency flow:

```txt
packages/<feature>        -> reusable implementation and optional server endpoints
apps/<api>                -> mounts package server extensions/controllers
packages/sdk              -> calls the mounted API over HTTP
apps/web or external apps -> import @genspire/sdk
```

Avoid:

```txt
packages/sdk -> packages/auth/server/controllers
packages/sdk -> packages/auth/application/services
packages/sdk -> packages/auth/domain/entities
```

The SDK may share stable request/response types only when those types are intentionally exported as public contracts. Prefer generating SDK types from OpenAPI once the API surface stabilizes.

## Example Reference

When an agent needs a current example of the intended API architecture, use:

* `apps/playground-api` for controller + Swagger + libSQL + MikroORM
* `apps/person-api` for a smaller SQL-backed API example
* `packages/auth` for reusable package APIs once it has been migrated to the `domain/application/infrastructure/server/extension` shape

Prefer following these examples rather than inventing a parallel structure.

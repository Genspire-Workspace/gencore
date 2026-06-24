<!-- file: AGENTS.md -->
# Agent Instructions

## Package Manager

Use Bun for this repository.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`.
- Use `bun test` instead of `jest` or `vitest`.
- Use `bun run <script>` instead of `npm run <script>`, `yarn run <script>`, or `pnpm run <script>`.
- Use `bun install` instead of `npm install`, `yarn install`, or `pnpm install`.
- Use `bunx <package> <command>` instead of `npx <package> <command>`.
- Bun automatically loads `.env`, so do not add `dotenv` unless there is an existing project-specific reason.

Prefer Bun-native APIs in new code when they fit the repo:

- `Bun.serve()` instead of Express for new Bun servers.
- `bun:sqlite` instead of `better-sqlite3`.
- `Bun.redis` instead of `ioredis`.
- `Bun.sql` instead of `pg` or `postgres.js`.
- Built-in `WebSocket` instead of `ws`.
- `Bun.file` where it is a clean fit for file reads/writes.
- `Bun.$` where shell execution is needed in Bun scripts.

## Generated CLI Template

Do not edit files under `packages/cli/template/**` directly.

That directory is synced by script and local edits there will be overwritten. When a change needs to affect the generated CLI template:

- Edit the source template package, usually under `packages/templates/**`, or the relevant source package that is vendored into the CLI template.
- Then run `bun run sync:cli-template` from the repository root.
- Review the generated changes under `packages/cli/template/**` only as build output.

## Repository Practices

Do not edit files under `packages/cli/template/**` directly.
Do not edit files under `pi-mono/**` directly.

- Keep edits scoped to the requested behavior.
- Preserve existing patterns before introducing new abstractions.
- Prefer `rg` for searching.
- Before changing generated or vendored-looking files, check whether a sync/build script owns them.
- Do not revert unrelated user changes in the working tree.

## GenCore Architecture

When working in this repository, preserve these boundaries:

- `@genspire/core` is the application kernel only.
- `@genspire/server` owns HTTP server concerns, controllers, routing, request context, response helpers, and OpenAPI metadata/building primitives.
- `@genspire/swagger` is only the Swagger/OpenAPI delivery extension and UI layer.
- `@genspire/data` is framework-agnostic and ORM-agnostic.
- `@genspire/data-mikroorm` owns MikroORM integration.

Do not move these into `@genspire/core`:

- `Server`
- `Router`
- controllers or controller decorators
- request/response types
- OpenAPI schema types
- `ApiDto` / `ApiField`
- Swagger concerns
- MikroORM, SQL, libSQL, PostgreSQL, repositories, or data source logic

Do not move these into `@genspire/swagger`:

- OpenAPI DTO decorators
- OpenAPI schema primitives
- OpenAPI document builders

Those belong in `packages/server/src/openapi/**`.

## API Creation Rules

When creating or modifying APIs in this repo, follow these patterns unless the user explicitly asks otherwise.

### App Composition

For a documented SQL-backed API, prefer this extension order:

1. `dataExtension()`
2. `mikroOrmExtension(...)`
3. any local schema/migration bootstrap extension
4. `serverExtension(...)`
5. `swaggerExtension(...)`

Register controllers only after the server extension is available.

### Routing Style

Prefer:

- function-first routes for simple endpoints or low-level examples
- controller classes for documented app APIs

Use `server.registerController()` or `server.registerControllers()` for controller-based APIs.

### Controllers

Controller decorators belong in `@genspire/server`.

Use:

- `@Controller()`
- `@Get()`
- `@Post()`
- `@Put()`
- `@Patch()`
- `@Delete()`

Controllers should:

- stay thin
- read request data from `RequestContext`
- delegate business logic to services
- return normalized values or response helpers from `@genspire/server`

### DTOs and OpenAPI Metadata

For documented APIs, import DTO/OpenAPI decorators from `@genspire/server`, not `@genspire/swagger`.

Use:

- `ApiDto`
- `ApiField`
- route `request`, `requestBody`, `query`, and `response` docs

Prefer explicit DTOs over ad hoc anonymous objects when a route is part of a documented API.

### Service and Repository Layering

For data-backed APIs, prefer:

- controller
- service
- repository
- entity

Rules:

- controllers handle HTTP only
- services handle validation and business rules
- repositories handle persistence
- IDs are generated on the backend, not in clients

### MikroORM Usage

When using MikroORM in this repo:

- use `EntityManagerProvider`
- prefer `fork()` for request work
- keep ORM wiring in `@genspire/data-mikroorm`
- do not couple MikroORM directly into `@genspire/server`

For local/playground apps, schema update on startup is acceptable with a comment that production should use migrations.

### Swagger

`@genspire/swagger` should only:

- register `/swagger.json`
- register `/docs`
- render Swagger UI

If a task asks for OpenAPI schema generation changes, first consider whether the change belongs in:

- `packages/server/src/openapi/**`

not in `packages/swagger/**`.

## Example Reference

When an agent needs a current example of the intended API architecture, use:

- `apps/playground-api` for controller + Swagger + libSQL + MikroORM
- `apps/person-api` for a smaller SQL-backed API example

Prefer following these examples rather than inventing a parallel structure.

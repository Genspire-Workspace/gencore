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

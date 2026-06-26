<!-- file: apps\playground-ai\README.md -->

# AI Verification

This folder contains manual and smoke-style verification scripts for `@genspire/ai`.

These scripts are intended for:

- live provider checks against Ollama or DeepSeek
- `AiContext` request-building verification
- HTTP verification against the playground API

They are not a replacement for `bun test`. They complement the Bun test suite with higher-level runtime checks.

## Files

Main entry points:

- [verify-generation.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/verify-generation.ts)
- [verify-ai-context.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/verify-ai-context.ts)
- [verify-api.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/verify-api.ts)
- [verify-ai-sessions.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/verify-ai-sessions.ts)
- [verify-ai-sessions.test.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/verify-ai-sessions.test.ts)

Shared support:

- [shared/index.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/shared/index.ts)
- [tools/test-tools.ts](/C:/Users/PC/Documents/GitHub/Gencore/apps/playground-ai/tools/test-tools.ts)

## Suites

`verify-generation.ts`

- verifies direct `AiService` chat and embeddings flows
- exercises plain chat, reasoning, and tool-call scenarios

`verify-ai-context.ts`

- verifies `AiContext` request construction
- includes deterministic local tool-layer preflight checks
- exercises multi-turn and multi-tool conversations

`verify-api.ts`

- verifies the playground API over HTTP
- checks `/health`, `/ai/providers`, `/ai/chat`, `/ai/chat/stream`, and `/ai/embeddings`

`verify-ai-sessions.ts`

- verifies the session-based AI conversation API over HTTP
- registers a verifier account and exercises session CRUD, ownership isolation, message replay, generation, streaming, and title auto-derivation
- checks `/ai/sessions`, `/ai/sessions/:id`, `/ai/sessions/:id/messages`, and `/ai/sessions/:id/messages/stream`

`verify-ai-sessions.test.ts`

- deterministic `bun:test` suite that boots the playground app in-process
- covers session CRUD, per-user ownership, empty-history baseline, message cascade on delete, and authentication enforcement (no live model calls)

## Commands

### Bun test suites

Run the deterministic `bun:test` suites (no live model calls, boot the playground app in-process):

```bash
# All AI verification bun:test suites in this folder
bun test apps/playground-ai

# Session persistence suite only (CRUD, ownership, cascade, auth)
bun test apps/playground-ai/verify-ai-sessions.test.ts

# Shared deterministic tool-layer preflight tests
bun test apps/playground-ai/shared/verify-api-tools.test.ts
```

### Live HTTP verification scripts

These require the playground API to already be running (`bun run dev:playground-api`), unless noted otherwise.

Root scripts:

- `bun run dev:ai:verify` — direct `AiService` generation checks
- `bun run dev:ai-context:verify` — `AiContext` request-building checks
- `bun run dev:api:verify` — playground API `/ai/*` checks
- `bun run dev:ai-sessions:verify` — playground API `/ai/sessions/*` checks
- `bun run dev:ai:verify:local` — generation + context checks combined

Direct execution:

```bash
bun apps/playground-ai/verify-generation.ts
bun apps/playground-ai/verify-ai-context.ts
bun apps/playground-ai/verify-api.ts
bun apps/playground-ai/verify-ai-sessions.ts
```

List help:

```bash
bun run dev:ai:verify -- --list
bun run dev:ai-context:verify -- --list
bun run dev:api:verify -- --list
bun run dev:ai-sessions:verify -- --list
```

Scenario filtering:

```bash
bun run dev:ai:verify -- --scenarios ollama
bun run dev:ai:verify -- --scenario ollama
bun run dev:ai:verify -- --s ollama
bun run dev:ai:verify -- -s ollama
bun run dev:ai-sessions:verify -- --scenarios ollama
bun run dev:ai-sessions:verify -- -s ollama
```

API base URL override:

```bash
bun run dev:api:verify -- --base-url http://localhost:3000
bun run dev:api:verify -- -b http://localhost:3000
bun run dev:ai-sessions:verify -- --base-url http://localhost:3000
bun run dev:ai-sessions:verify -- -b http://localhost:3000
```

Ollama model override:

```bash
bun run dev:ai:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama
bun run dev:ai-context:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama
bun run dev:api:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama
bun run dev:ai-sessions:verify -- --ollama-model gemma4:31b-cloud --scenarios ollama
```

## Environment

Common scenario filter:

- `AI_VERIFY_SCENARIOS`
- `AI_VERIFY_OLLAMA_MODEL`

Generation and context verification:

- `OLLAMA_HOST`
- `OLLAMA_API_KEY`
- `OLLAMA_CHAT_MODEL`
- `OLLAMA_EMBED_MODEL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_CHAT_MODELS`
- `DEEPSEEK_EMBED_MODEL`

API verification:

- `AI_API_BASE_URL`
- `OLLAMA_API_KEY`

Session verification (logs in with the seeded admin):

- `GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL`
- `GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD`

Optional generation debug:

- `AI_VERIFY_DUMP_CHUNKS=true`

Ollama authenticated setup:

```env
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_API_KEY=your-ollama-api-key
OLLAMA_CHAT_MODEL=gemma4:12b
OLLAMA_EMBED_MODEL=embeddinggemma:latest
```

When `OLLAMA_API_KEY` is set, the direct verifier runtime and the playground API runtime send:

```txt
Authorization: Bearer <OLLAMA_API_KEY>
```

This mirrors the existing DeepSeek pattern, except Ollama auth is passed through as an HTTP header instead of a dedicated client `apiKey` field.

## Logs

Logs are written under:

- `data/logs/ai-verification/generation`
- `data/logs/ai-verification/ai-context`
- `data/logs/ai-verification/api`
- `data/logs/ai-verification/sessions`

Example:

```txt
data/logs/ai-verification/generation/verify-generation-2026-06-25-20-11-27-799.log
data/logs/ai-verification/ai-context/verify-ai-context-2026-06-25-20-16-16-66.log
data/logs/ai-verification/api/verify-api-2026-06-25-20-20-10-123.log
data/logs/ai-verification/sessions/verify-ai-sessions-2026-06-25-23-49-12-345.log
```

## Notes

- Provider output is intentionally not asserted strictly in the live scripts.
- Deterministic local preflight checks in `verify-ai-context.ts` are strict and should fail loudly if the tool layer regresses.
- Ollama may be skipped when the local `ollama` package or runtime is unavailable.
- `verify-api.ts` assumes the playground API is already running when you execute non-`--list` commands.
- `verify-ai-sessions.ts` assumes the playground API is already running; it registers its own verifier account.
- `verify-ai-sessions.test.ts` boots the playground app in-process and makes no live model calls.


For PowerShell, use:

$env:AI_VERIFY_TOOL_DELAY_MIN_MS="15000"
$env:AI_VERIFY_TOOL_DELAY_MAX_MS="25000"
$env:AI_VERIFY_TOOL_DELAY_ROUNDS="2"

bun run dev:api:verify -- --base-url http://localhost:3000 --scenarios ollama

Then, when you want to clear them:

Remove-Item Env:AI_VERIFY_TOOL_DELAY_MIN_MS
Remove-Item Env:AI_VERIFY_TOOL_DELAY_MAX_MS
Remove-Item Env:AI_VERIFY_TOOL_DELAY_ROUNDS

Or run it in one PowerShell line like this:

$env:AI_VERIFY_TOOL_DELAY_MIN_MS="15000"; $env:AI_VERIFY_TOOL_DELAY_MAX_MS="25000"; $env:AI_VERIFY_TOOL_DELAY_ROUNDS="2"; bun run dev:api:verify -- --base-url http://localhost:3000 --scenarios ollama

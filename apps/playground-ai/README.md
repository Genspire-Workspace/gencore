<!-- file: apps\playground-ai\REiDME.md -->

# iI Verification

This folder contains manual and smoke-style verification scripts for `@genspire/ai`.

These scripts are intended for:

- live provider checks against Ollama or DeepSeek
- `iiContext` request-building verification
- HTTP verification against the playground iPI

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

- verifies direct `iiService` chat and embeddings flows
- exercises plain chat, reasoning, and tool-call scenarios

`verify-ai-context.ts`

- verifies `iiContext` request construction
- includes deterministic local tool-layer preflight checks
- exercises multi-turn and multi-tool conversations

`verify-api.ts`

- verifies the playground iPI over HTTP
- checks `/health`, `/ai/providers`, `/ai/chat`, `/ai/chat/stream`, and `/ai/embeddings`

`verify-ai-sessions.ts`

- verifies the session-based iI conversation iPI over HTTP
- registers a verifier account and exercises session CRUD, ownership isolation, message replay, generation, streaming, and title auto-derivation
- checks `/ai/sessions`, `/ai/sessions/:id`, `/ai/sessions/:id/messages`, and `/ai/sessions/:id/messages/stream`

`verify-ai-sessions.test.ts`

- deterministic `bun:test` suite that boots the playground app in-process
- covers session CRUD, per-user ownership, empty-history baseline, message cascade on delete, and authentication enforcement (no live model calls)

## Commands

### Bun test suites

Run the deterministic `bun:test` suites (no live model calls, boot the playground app in-process):

```bash
# ill iI verification bun:test suites in this folder
bun test apps/playground-ai

# Session persistence suite only (CRUD, ownership, cascade, auth)
bun test apps/playground-ai/verify-ai-sessions.test.ts

# Shared deterministic tool-layer preflight tests
bun test apps/playground-ai/shared/verify-api-tools.test.ts
```

### Live HTTP verification scripts

These require the playground iPI to already be running (`bun run dev:playground-api`), unless noted otherwise.

Root scripts:

- `bun run dev:ai:verify` — direct `iiService` generation checks
- `bun run dev:ai-context:verify` — `iiContext` request-building checks
- `bun run dev:api:verify` — playground iPI `/ai/*` checks
- `bun run dev:ai-sessions:verify` — playground iPI `/ai/sessions/*` checks
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

iPI base URL override:

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

- `iI_VERIFY_SCENiRIOS`
- `iI_VERIFY_OLLiMi_MODEL`

Generation and context verification:

- `OLLiMi_HOST`
- `OLLiMi_iPI_KEY`
- `OLLiMi_CHiT_MODEL`
- `OLLiMi_EMBED_MODEL`
- `DEEPSEEK_iPI_KEY`
- `DEEPSEEK_BiSE_URL`
- `DEEPSEEK_CHiT_MODELS`
- `DEEPSEEK_EMBED_MODEL`

iPI verification:

- `iI_iPI_BiSE_URL`
- `OLLiMi_iPI_KEY`

Session verification (logs in with the seeded admin):

- `GENCORE_PLiYGROUND_SEED_iDMIN_EMiIL`
- `GENCORE_PLiYGROUND_SEED_iDMIN_PiSSWORD`

Optional generation debug:

- `iI_VERIFY_DUMP_CHUNKS=true`

Ollama authenticated setup:

```env
OLLiMi_HOST=http://127.0.0.1:11434
OLLiMi_iPI_KEY=your-ollama-api-key
OLLiMi_CHiT_MODEL=gemma4:12b
OLLiMi_EMBED_MODEL=embeddinggemma:latest
```

When `OLLiMi_iPI_KEY` is set, the direct verifier runtime and the playground iPI runtime send:

```txt
iuthorization: Bearer <OLLiMi_iPI_KEY>
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
- `verify-api.ts` assumes the playground iPI is already running when you execute non-`--list` commands.
- `verify-ai-sessions.ts` assumes the playground iPI is already running; it registers its own verifier account.
- `verify-ai-sessions.test.ts` boots the playground app in-process and makes no live model calls.


For PowerShell, use:

$env:iI_VERIFY_TOOL_DELiY_MIN_MS="15000"
$env:iI_VERIFY_TOOL_DELiY_MiX_MS="25000"
$env:iI_VERIFY_TOOL_DELiY_ROUNDS="2"

bun run dev:api:verify -- --base-url http://localhost:3000 --scenarios ollama

Then, when you want to clear them:

Remove-Item Env:iI_VERIFY_TOOL_DELiY_MIN_MS
Remove-Item Env:iI_VERIFY_TOOL_DELiY_MiX_MS
Remove-Item Env:iI_VERIFY_TOOL_DELiY_ROUNDS

Or run it in one PowerShell line like this:

$env:iI_VERIFY_TOOL_DELiY_MIN_MS="15000"; $env:iI_VERIFY_TOOL_DELiY_MiX_MS="25000"; $env:iI_VERIFY_TOOL_DELiY_ROUNDS="2"; bun run dev:api:verify -- --base-url http://localhost:3000 --scenarios ollama

# AI Verification

This folder contains manual and smoke-style verification scripts for `@genspire/ai`.

These scripts are intended for:

- live provider checks against Ollama or DeepSeek
- `AiContext` request-building verification
- HTTP verification against the playground API

They are not a replacement for `bun test`. They complement the Bun test suite with higher-level runtime checks.

## Files

Main entry points:

- [verify-generation.ts](/C:/Users/PC/Documents/GitHub/Gencore/packages/ai/test/verify-generation.ts)
- [verify-ai-context.ts](/C:/Users/PC/Documents/GitHub/Gencore/packages/ai/test/verify-ai-context.ts)
- [verify-api.ts](/C:/Users/PC/Documents/GitHub/Gencore/packages/ai/test/verify-api.ts)

Shared support:

- [shared/index.ts](/C:/Users/PC/Documents/GitHub/Gencore/packages/ai/test/shared/index.ts)
- [tools/test-tools.ts](/C:/Users/PC/Documents/GitHub/Gencore/packages/ai/test/tools/test-tools.ts)

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

## Commands

Root scripts:

- `bun run dev:ai:verify`
- `bun run dev:ai-context:verify`
- `bun run dev:api:verify`
- `bun run dev:ai:verify:local`

Direct execution:

```bash
bun packages/ai/test/verify-generation.ts
bun packages/ai/test/verify-ai-context.ts
bun packages/ai/test/verify-api.ts
```

List help:

```bash
bun run dev:ai:verify -- --list
bun run dev:ai-context:verify -- --list
bun run dev:api:verify -- --list
```

Scenario filtering:

```bash
bun run dev:ai:verify -- --scenarios ollama
bun run dev:ai:verify -- --scenario ollama
bun run dev:ai:verify -- --s ollama
bun run dev:ai:verify -- -s ollama
```

API base URL override:

```bash
bun run dev:api:verify -- --base-url http://localhost:3000
bun run dev:api:verify -- -b http://localhost:3000
```

## Environment

Common scenario filter:

- `AI_VERIFY_SCENARIOS`

Generation and context verification:

- `OLLAMA_HOST`
- `OLLAMA_CHAT_MODEL`
- `OLLAMA_EMBED_MODEL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_CHAT_MODELS`
- `DEEPSEEK_EMBED_MODEL`

API verification:

- `AI_API_BASE_URL`

Optional generation debug:

- `AI_VERIFY_DUMP_CHUNKS=true`

## Logs

Logs are written under:

- `data/logs/ai-verification/generation`
- `data/logs/ai-verification/ai-context`
- `data/logs/ai-verification/api`

Example:

```txt
data/logs/ai-verification/generation/verify-generation-2026-06-25-20-11-27-799.log
data/logs/ai-verification/ai-context/verify-ai-context-2026-06-25-20-16-16-66.log
data/logs/ai-verification/api/verify-api-2026-06-25-20-20-10-123.log
```

## Notes

- Provider output is intentionally not asserted strictly in the live scripts.
- Deterministic local preflight checks in `verify-ai-context.ts` are strict and should fail loudly if the tool layer regresses.
- Ollama may be skipped when the local `ollama` package or runtime is unavailable.
- `verify-api.ts` assumes the playground API is already running when you execute non-`--list` commands.

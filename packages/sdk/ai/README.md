# `@genspire/sdk-ai`

Framework-agnostic TypeScript SDK for GenSpire AI APIs.

## Structure

- `FetchAiClient`
  - Stateless AI operations.
  - Chat generation.
  - Streaming chat generation.
  - Embeddings.
- `FetchAiSessionClient`
  - Session-scoped API operations.
  - Session CRUD.
  - Session graph fetches.
  - Session turn streaming.
- `AiSessionWorkspaceManager`
  - Higher-level client orchestration for session UIs.
  - Per-session graph cache.
  - Selected-session state.
  - Optimistic streaming updates.
  - Stop/cancel orchestration.
- `FetchAiHttpTransport`
  - Shared HTTP and SSE transport used by both clients.

## Intended layering

Use the low-level clients when you only need transport access:

```ts
const transport = new FetchAiHttpTransport({
  baseUrl,
  getAccessToken,
});

const aiClient = new FetchAiClient(transport);
const aiSessionClient = new FetchAiSessionClient(transport);
```

Use `AiSessionWorkspaceManager` when the client needs session state orchestration:

```ts
const workspace = new AiSessionWorkspaceManager(aiSessionClient, {
  defaultProvider: 'ollama',
  defaultModel: 'gemma4:12b',
  activeSessionStore: new BrowserActiveSessionStore('my-session-key'),
});
```

## Current Angular usage

`apps/playground-angular` uses:

- `FetchAiSessionClient` for session transport
- `BrowserActiveSessionStore` for persisted selected session id
- `AiSessionWorkspaceManager` as the canonical session state/orchestration layer

Angular stores should stay thin adapters over the SDK rather than reimplementing session transport or stream orchestration locally.

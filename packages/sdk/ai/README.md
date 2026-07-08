# `@genspire/sdk-ai`

Framework-agnostic TypeScript SDK for GenSpire AI APIs.

This package is designed for apps that talk to a running GenSpire server over HTTP and SSE. It does not import backend controllers, services, or persistence code directly. It consumes the public AI API surface exposed by the server.

## What It Covers

The SDK currently covers two different AI interaction styles:

1. Stateless generation
2. Session-based generation

Stateless generation is for one-off calls such as:
- chat generation
- chat streaming
- embedding generation

Session-based generation is for stateful chat workspaces such as:
- listing sessions
- creating sessions
- loading a session graph
- sending a message to a timeline
- canceling an in-flight streamed session response
- keeping local per-session workspace state

## Main Pieces

### `FetchAiHttpTransport`

File: [src/infrastructure/http/fetch-ai-http-transport.ts](./src/infrastructure/http/fetch-ai-http-transport.ts)

This is the shared low-level HTTP layer.

It is responsible for:
- base URL resolution
- attaching auth headers
- JSON request/response handling
- nullable GET handling for `404`
- SSE stream consumption

Both higher-level clients use this transport so that request behavior is defined in one place.

### `FetchAiClient`

File: [src/infrastructure/http/fetch-ai-client.ts](./src/infrastructure/http/fetch-ai-client.ts)

This is the stateless AI client.

It targets the regular generation endpoints under `/api/v1/ai/generation` and exposes:
- `generateChat()`
- `streamChat()`
- `generateEmbedding()`

Use this when you want plain AI capabilities without session orchestration.

### `FetchAiSessionClient`

File: [src/infrastructure/http/fetch-ai-session-client.ts](./src/infrastructure/http/fetch-ai-session-client.ts)

This is the session-specific client.

It targets `/api/v1/ai/sessions` and exposes session API operations such as:
- `listSessions()`
- `createSession()`
- `getSession()`
- `updateSession()`
- `getSessionGraph()`
- `streamMessage()`

Use this when you want to work with persisted AI sessions and timelines.

### `AiSessionWorkspaceManager`

File: [src/application/services/ai-session-workspace-manager.ts](./src/application/services/ai-session-workspace-manager.ts)

This is the higher-level state orchestration layer built on top of the session client contract.

It is responsible for:
- per-session in-memory cache keyed by `sessionId`
- selected session tracking
- graph-first session refresh
- optimistic user/assistant message handling during streaming
- stop/cancel orchestration with `AbortController`
- preserving prompt, attachments, provider, and model per session

This is the reusable part that UI frameworks can bind to.

Angular, React, a CLI, or another TypeScript app can each adapt this manager to their own state/rendering model.

### `BrowserActiveSessionStore`

File: [src/infrastructure/http/browser-active-session-store.ts](./src/infrastructure/http/browser-active-session-store.ts)

This is an optional browser-only helper for persisting the active session id in `localStorage`.

It is not required for the SDK to work. It is only a convenience adapter for browser apps.

## Package Structure

The package follows the repo's layered package shape:

- `src/domain`
  Reusable SDK-facing types for generation, embeddings, session state, and workspace state.
- `src/application`
  Contracts and higher-level orchestration logic.
- `src/infrastructure`
  HTTP and SSE implementations.

## How The Layers Fit Together

Typical usage looks like this:

```ts
import {
  AiSessionWorkspaceManager,
  BrowserActiveSessionStore,
  FetchAiClient,
  FetchAiHttpTransport,
  FetchAiSessionClient,
} from "@genspire/sdk-ai";

const transport = new FetchAiHttpTransport({
  baseUrl: "http://localhost:3000",
  getAccessToken: async () => "token",
});

const aiClient = new FetchAiClient(transport);
const aiSessionClient = new FetchAiSessionClient(transport);

const workspace = new AiSessionWorkspaceManager(aiSessionClient, {
  defaultProvider: "openai",
  defaultModel: "gpt-4.1",
  activeSessionStore: new BrowserActiveSessionStore("my-app.ai-session-id"),
});
```

That gives you:
- `aiClient` for stateless chat and embeddings
- `aiSessionClient` for direct session API access
- `workspace` for session UI orchestration

## What It Uses

The SDK relies on:
- the public AI server contracts from `@genspire/ai/server/contracts`
- the public AI domain message/content types from `@genspire/ai/domain`
- platform `fetch`
- platform `AbortController`
- platform `ReadableStream` support for SSE streaming

It does not depend on:
- Angular
- React
- RxJS
- backend controllers or database code

## Intended Consumers

This package is meant to support:
- browser apps
- Angular apps
- React apps
- CLIs
- other TypeScript runtimes with `fetch` support

For browser-focused apps, the `BrowserActiveSessionStore` helper is available.

For non-browser apps, provide your own active-session persistence or skip that feature entirely.

## Current Scope

Implemented now:
- stateless chat generation
- stateless chat streaming
- embeddings
- session graph loading
- session message streaming
- per-session workspace orchestration

Likely future additions:
- provider discovery
- model discovery
- timeline and branch helpers
- regeneration helpers
- top-level `createAiSdk()` factory


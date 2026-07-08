# `@genspire/sdk-auth`

Framework-agnostic TypeScript SDK for GenSpire auth APIs.

## Structure

- `FetchAuthClient`
  - Stateless auth API client.
  - Login.
  - Register.
  - Refresh.
  - Logout.
- `FetchAuthHttpTransport`
  - Shared JSON HTTP transport for auth requests.
  - Configurable `baseUrl`.
  - Optional `getAccessToken` hook for bearer auth.

## Intended layering

Use the SDK when a frontend or external client needs to talk to the mounted auth API over HTTP:

```ts
const authClient = new FetchAuthClient({
  baseUrl: 'http://localhost:3000',
});

const session = await authClient.login({
  email: 'user@example.com',
  password: 'secret',
});
```

If the caller already owns transport configuration, construct the transport once and pass it in:

```ts
const transport = new FetchAuthHttpTransport({
  baseUrl,
});

const authClient = new FetchAuthClient(transport);
```

## Current Angular usage

`apps/playground-angular` uses:

- `FetchAuthClient` as the canonical auth transport
- app-local `AuthService` for token persistence, refresh timing, and auth state

Angular should keep session persistence and UI state local, while the SDK remains responsible for the HTTP contract with the server.

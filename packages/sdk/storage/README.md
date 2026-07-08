# `@genspire/sdk-storage`

Framework-agnostic TypeScript SDK for GenSpire storage APIs.

## Structure

- `FetchStorageClient`
  - Stateless storage API client.
  - File listing.
  - Multipart file upload.
  - Download URL creation.
- `FetchStorageHttpTransport`
  - Shared HTTP transport for storage requests.
  - Configurable `baseUrl`.
  - Optional `getAccessToken` hook for bearer auth.

## Intended layering

Use the SDK when a frontend or external client needs storage access through the mounted server API:

```ts
const storageClient = new FetchStorageClient({
  baseUrl: 'http://localhost:3000',
  getAccessToken,
});

const files = await storageClient.listFiles();
```

Uploads are handled as multipart form data by the SDK:

```ts
await storageClient.uploadFile(file);
const downloadUrl = storageClient.createDownloadUrl(fileId);
```

## Current Angular usage

`apps/playground-angular` uses:

- `FetchStorageClient` as the canonical storage transport
- app-local `FileService` as a thin adapter over the SDK
- app-local `AuthService` to supply access tokens to the SDK transport

Angular should not rebuild multipart upload or storage URL logic locally when the same behavior belongs in the SDK.

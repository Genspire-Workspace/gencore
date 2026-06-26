// file: apps\playground-ai\shared\verify-http.test.ts

import { describe, expect, test } from "bun:test";
import { streamNdjsonOrJson } from "./verify-http.js";

describe("verify-http", () => {
  test("streamNdjsonOrJson parses NDJSON from a fetch response", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response(
          "{\"step\":1}\n{\"step\":2}\n",
          {
            headers: {
              "content-type": "application/x-ndjson",
            },
          },
        );
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}`);
      const chunks: unknown[] = [];

      for await (const chunk of streamNdjsonOrJson(response)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { step: 1 },
        { step: 2 },
      ]);
    } finally {
      server.stop(true);
    }
  });

  test("streamNdjsonOrJson parses plain JSON responses", async () => {
    const response = new Response(
      JSON.stringify({ ok: true }),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const chunks: unknown[] = [];
    for await (const chunk of streamNdjsonOrJson(response)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ ok: true }]);
  });
});

import type { GenExtension } from "@genspire/core";
import { Server, buildOpenApiDocument, text } from "@genspire/server";

export interface SwaggerExtensionOptions {
  enabled?: boolean;
  jsonPath?: string;
  docsPath?: string;
  title?: string;
  version?: string;
  description?: string;
}

function getSwaggerHtml(jsonPath: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '${jsonPath}',
      dom_id: '#swagger-ui'
    });
  </script>
</body>
</html>`;
}

export function swaggerExtension(options: SwaggerExtensionOptions = {}): GenExtension {
  const resolved = {
    enabled: options.enabled ?? true,
    jsonPath: options.jsonPath ?? "/swagger.json",
    docsPath: options.docsPath ?? "/docs",
    title: options.title ?? "GenCore API",
    version: options.version ?? "0.1.0",
    description: options.description ?? "Generated API documentation",
  };

  return {
    name: "swagger",
    dependsOn: ["server"],

    register(app) {
      if (!resolved.enabled) {
        return;
      }

      const server = app.get(Server);

      server.get(
        resolved.jsonPath,
        () =>
          buildOpenApiDocument(server.listRoutes(), {
            title: resolved.title,
            version: resolved.version,
            description: resolved.description,
            jsonPath: resolved.jsonPath,
            docsPath: resolved.docsPath,
          }),
        { hidden: true },
      );

      server.get(
        resolved.docsPath,
        () =>
          text(getSwaggerHtml(resolved.jsonPath, resolved.title), {
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          }),
        { hidden: true },
      );
    },
  };
}

export type ResponseLike = Response | string | object | null | undefined;

export function toResponse(value: ResponseLike): Response {
  if (value instanceof Response) {
    return value;
  }

  if (typeof value === "string") {
    return new Response(value, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (value == null) {
    return new Response(null, { status: 204 });
  }

  return Response.json(value);
}

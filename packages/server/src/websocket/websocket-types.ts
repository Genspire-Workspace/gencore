import type { ServerWebSocket } from "bun";
import type { ScopedContainer } from "@genspire/core";

export interface WebSocketContext<TData = unknown> {
  ws: ServerWebSocket<TData>;
  data: TData;
  container: ScopedContainer;
}

export interface WebSocketRouteDefinition {
  path: string;
  onOpen?: string;
  onMessage?: string;
  onClose?: string;
}

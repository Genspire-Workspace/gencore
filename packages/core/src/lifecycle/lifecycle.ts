export interface OnInit {
  onInit(): void | Promise<void>;
}

export interface OnDestroy {
  onDestroy(): void | Promise<void>;
}

export interface OnStart {
  onStart(): void | Promise<void>;
}

export interface OnStop {
  onStop(): void | Promise<void>;
}

export function hasOnInit(value: unknown): value is OnInit {
  return typeof (value as OnInit | undefined)?.onInit === "function";
}

export function hasOnDestroy(value: unknown): value is OnDestroy {
  return typeof (value as OnDestroy | undefined)?.onDestroy === "function";
}

export function hasOnStart(value: unknown): value is OnStart {
  return typeof (value as OnStart | undefined)?.onStart === "function";
}

export function hasOnStop(value: unknown): value is OnStop {
  return typeof (value as OnStop | undefined)?.onStop === "function";
}

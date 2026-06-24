// file: packages\core\src\lifecycle\lifecycle.ts

export interface IOnInit {
  onInit(): void | Promise<void>;
}

export interface IOnDestroy {
  onDestroy(): void | Promise<void>;
}

export interface IOnStart {
  onStart(): void | Promise<void>;
}

export interface IOnStop {
  onStop(): void | Promise<void>;
}

export function hasOnInit(value: unknown): value is IOnInit {
  return typeof (value as IOnInit | undefined)?.onInit === "function";
}

export function hasOnDestroy(value: unknown): value is IOnDestroy {
  return typeof (value as IOnDestroy | undefined)?.onDestroy === "function";
}

export function hasOnStart(value: unknown): value is IOnStart {
  return typeof (value as IOnStart | undefined)?.onStart === "function";
}

export function hasOnStop(value: unknown): value is IOnStop {
  return typeof (value as IOnStop | undefined)?.onStop === "function";
}

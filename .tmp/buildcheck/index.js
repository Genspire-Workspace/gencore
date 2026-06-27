// @bun
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __name = (target, name) => {
  Object.defineProperty(target, "name", {
    value: name,
    enumerable: false,
    configurable: true
  });
  return target;
};
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => (key in obj) ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== undefined && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({
  kind: __decoratorStrings[kind],
  name,
  metadata,
  addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null))
});
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length;i < n; i++)
    flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : {
    get [name]() {
      return __privateGet(this, extra);
    },
    set [name](x) {
      __privateSet(this, extra, x);
    }
  }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1;i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => (name in x) };
      if (k ^ 3)
        access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2)
        access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? undefined : { get: desc.get, set: desc.set } : target, ctx);
    done._ = 1;
    if (k ^ 4 || it === undefined)
      __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null)
      __typeError("Object expected");
    else
      __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};

// packages/core/src/config/env-service.ts
class EnvService {
  get(key, defaultValue) {
    return process.env[key] ?? defaultValue;
  }
  require(key) {
    const value = this.get(key);
    if (value == null || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
  getNumber(key, defaultValue) {
    const value = this.get(key);
    if (value == null || value === "") {
      return defaultValue;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number.`);
    }
    return parsed;
  }
  requireNumber(key) {
    const value = this.getNumber(key);
    if (value == null) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
  getBoolean(key, defaultValue) {
    const value = this.get(key);
    if (value == null || value === "") {
      return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
    throw new Error(`Environment variable ${key} is not a valid boolean.`);
  }
  requireBoolean(key) {
    const value = this.getBoolean(key);
    if (value == null) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
  getAll() {
    return { ...process.env };
  }
}

// packages/core/src/lifecycle/lifecycle.ts
function hasOnInit(value) {
  return typeof value?.onInit === "function";
}
function hasOnDestroy(value) {
  return typeof value?.onDestroy === "function";
}

// packages/core/src/container/injection-context.ts
var resolverStack = [];
function runInInjectionContext(resolver, factory) {
  resolverStack.push(resolver);
  try {
    return factory();
  } finally {
    resolverStack.pop();
  }
}

// packages/core/src/container/decorators.ts
function setLifetime(target, lifetime) {
  target.__diLifetime = lifetime;
}
function getLifetime(target) {
  return target.__diLifetime;
}
function Singleton() {
  return (target) => {
    setLifetime(target, "singleton");
  };
}

// packages/core/src/container/scoped-container.ts
class ScopedContainer {
  root;
  instances = new Map;
  destroyables = new Set;
  constructor(root) {
    this.root = root;
  }
  resolve(token) {
    const registration = this.root.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }
    if (registration.lifetime === "singleton") {
      return this.root.resolveSingleton(token);
    }
    if (registration.lifetime === "transient") {
      if (!registration.implementation) {
        throw new Error(`No implementation registered for: ${token.name}`);
      }
      return this.root.instantiate(registration.implementation, this);
    }
    const existing = this.instances.get(token);
    if (existing !== undefined) {
      return existing;
    }
    if (!registration.implementation) {
      throw new Error(`No implementation registered for: ${token.name}`);
    }
    const instance = this.root.instantiate(registration.implementation, this);
    this.instances.set(token, instance);
    return instance;
  }
  trackDestroyable(instance) {
    if (hasOnDestroy(instance)) {
      this.destroyables.add(instance);
    }
  }
  async destroy() {
    for (const value of [...this.destroyables].reverse()) {
      if (hasOnDestroy(value)) {
        await value.onDestroy();
      }
    }
    this.destroyables.clear();
    this.instances.clear();
  }
}

// packages/core/src/container/container.ts
class Container {
  registrations = new Map;
  singletons = new Map;
  destroyables = new Set;
  registerSingleton(token, implementation) {
    this.registrations.set(token, {
      token,
      lifetime: "singleton",
      implementation: implementation ?? token
    });
  }
  registerScoped(token, implementation) {
    this.registrations.set(token, {
      token,
      lifetime: "scoped",
      implementation: implementation ?? token
    });
  }
  registerTransient(token, implementation) {
    this.registrations.set(token, {
      token,
      lifetime: "transient",
      implementation: implementation ?? token
    });
  }
  registerInstance(token, instance) {
    this.registrations.set(token, {
      token,
      lifetime: "singleton",
      instance
    });
    this.singletons.set(token, instance);
    this.trackDestroyable(instance);
  }
  autoRegister(...types) {
    for (const type of types) {
      const lifetime = getLifetime(type);
      if (lifetime === "singleton") {
        this.registerSingleton(type);
      } else if (lifetime === "scoped") {
        this.registerScoped(type);
      } else if (lifetime === "transient") {
        this.registerTransient(type);
      }
    }
  }
  createScope() {
    return new ScopedContainer(this);
  }
  isRegistered(token) {
    return this.registrations.has(token) || getLifetime(token) != null;
  }
  getRegistration(token) {
    return this.ensureRegistration(token);
  }
  resolve(token) {
    const registration = this.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }
    if (registration.lifetime === "singleton") {
      return this.resolveSingleton(token);
    }
    if (registration.lifetime === "transient") {
      if (!registration.implementation) {
        throw new Error(`No implementation registered for: ${token.name}`);
      }
      return this.instantiate(registration.implementation);
    }
    throw new Error(`Scoped dependency ${token.name} requires a scope.`);
  }
  resolveSingleton(token) {
    const existing = this.singletons.get(token);
    if (existing !== undefined) {
      return existing;
    }
    const registration = this.ensureRegistration(token);
    if (!registration) {
      throw new Error(`Type not registered: ${token.name}`);
    }
    if (registration.instance !== undefined) {
      this.singletons.set(token, registration.instance);
      return registration.instance;
    }
    if (!registration.implementation) {
      throw new Error(`No implementation registered for: ${token.name}`);
    }
    const instance = this.instantiate(registration.implementation);
    this.singletons.set(token, instance);
    return instance;
  }
  instantiate(type, scope) {
    const injections = type.inject ?? [];
    const resolver = (token) => scope ? scope.resolve(token) : this.resolve(token);
    const args = injections.map((token) => resolver(token));
    const instance = runInInjectionContext(resolver, () => new type(...args));
    if (hasOnInit(instance)) {
      instance.onInit();
    }
    if (scope) {
      scope.trackDestroyable(instance);
    } else {
      this.trackDestroyable(instance);
    }
    return instance;
  }
  async destroy() {
    for (const value of [...this.destroyables].reverse()) {
      if (hasOnDestroy(value)) {
        await value.onDestroy();
      }
    }
    this.destroyables.clear();
    this.singletons.clear();
  }
  ensureRegistration(token) {
    const existing = this.registrations.get(token);
    if (existing) {
      return existing;
    }
    const lifetime = getLifetime(token);
    if (!lifetime) {
      return;
    }
    if (lifetime === "singleton") {
      this.registerSingleton(token);
    } else if (lifetime === "scoped") {
      this.registerScoped(token);
    } else {
      this.registerTransient(token);
    }
    return this.registrations.get(token);
  }
  trackDestroyable(instance) {
    if (hasOnDestroy(instance)) {
      this.destroyables.add(instance);
    }
  }
}

// packages/core/src/logging/logger.ts
import path from "path";
var LOG_LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
var LOG_LEVEL_COLORS = {
  debug: {
    foreground: "90",
    background: "100"
  },
  info: {
    foreground: "34",
    background: "44"
  },
  warn: {
    foreground: "33",
    background: "43"
  },
  error: {
    foreground: "31",
    background: "41"
  }
};
function isSensitiveKey(key) {
  const normalized = key.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  return /\bapi[_-]?key\b/.test(normalized) || /\b(access|refresh|id)?[_-]?token\b/.test(normalized) || /\bpassword\b/.test(normalized) || /\bsecret\b/.test(normalized) || /\bauthorization\b/.test(normalized);
}
function sanitizeValue(value, seen = new WeakSet) {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? "[redacted]" : sanitizeValue(entry, seen);
    }
    return out;
  }
  return String(value);
}
function toErrorData(error) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    };
  }
  return { error: String(error) };
}
function normalizeStackFile(filePath) {
  const normalized = filePath.replace(/^file:\/\//, "");
  const relative = path.relative(process.cwd(), normalized);
  return relative && !relative.startsWith("..") ? relative : normalized;
}
function parseStackLine(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/\((.+):(\d+):(\d+)\)$/) ?? trimmed.match(/at (.+):(\d+):(\d+)$/);
  if (!match) {
    return null;
  }
  const [, file, lineNumber, columnNumber] = match;
  if (!file || !lineNumber || !columnNumber) {
    return null;
  }
  return {
    file: normalizeStackFile(file),
    line: lineNumber,
    column: columnNumber
  };
}
function isApplicationStackFrame(line) {
  return !line.includes("/src/logging/logger.") && !line.includes("\\src\\logging\\logger.") && !line.includes("node:internal") && !line.includes("internal/");
}
function captureCallSite() {
  const holder = {};
  Error.captureStackTrace?.(holder, captureCallSite);
  const stackLines = holder.stack?.split(`
`).slice(1) ?? [];
  for (const line of stackLines) {
    if (!isApplicationStackFrame(line)) {
      continue;
    }
    const location = parseStackLine(line);
    if (location) {
      return `${location.file}:${location.line}:${location.column}`;
    }
  }
  return;
}
function supportsAnsiColors() {
  if (process.env["NO_COLOR"]) {
    return false;
  }
  if (process.env["FORCE_COLOR"]) {
    return true;
  }
  if (process.env["COLORTERM"]) {
    return true;
  }
  if (process.env["TERM_PROGRAM"] === "vscode") {
    return true;
  }
  if (process.env["WT_SESSION"]) {
    return true;
  }
  if (process.env["ANSICON"]) {
    return true;
  }
  const term = process.env["TERM"]?.trim().toLowerCase() ?? "";
  if (term && term !== "dumb") {
    return true;
  }
  return Boolean(process.stdout?.isTTY);
}
function colorize(value, code, enabled) {
  return enabled ? `\x1B[${code}m${value}\x1B[0m` : value;
}
function formatTimestamp(timestamp, level, enabled) {
  return colorize(timestamp, LOG_LEVEL_COLORS[level].foreground, enabled);
}
function formatLevel(level, enabled) {
  const { background } = LOG_LEVEL_COLORS[level];
  return colorize(` ${level.toUpperCase()} `, `1;37;${background}`, enabled);
}
function formatLogPrefix(entry, enabled) {
  return `${formatTimestamp(entry.timestamp, entry.level, enabled)} ${formatLevel(entry.level, enabled)}: `;
}
function formatData(data) {
  if (!data) {
    return [];
  }
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    lines.push(`      ${key}: ${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`);
  }
  return lines;
}
function formatConsoleEntry(entry, colorsEnabled) {
  return [
    `${formatLogPrefix(entry, colorsEnabled)}${colorize(entry.category, "1", colorsEnabled)}${entry.source ? ` ${colorize(`[${entry.source}]`, "90", colorsEnabled)}` : ""}`,
    `      ${entry.message}`,
    ...formatData(entry.data)
  ].join(`
`);
}

class Logger {
  category;
  minLevel;
  format;
  colorsEnabled;
  store;
  constructor(category, minLevel, format, colorsEnabled, store) {
    this.category = category;
    this.minLevel = minLevel;
    this.format = format;
    this.colorsEnabled = colorsEnabled;
    this.store = store;
  }
  debug(message, data) {
    this.write("debug", message, data);
  }
  info(message, data) {
    this.write("info", message, data);
  }
  warn(message, data) {
    this.write("warn", message, data);
  }
  error(message, errorOrData, data) {
    if (errorOrData instanceof Error) {
      this.write("error", message, {
        ...data,
        ...toErrorData(errorOrData)
      });
      return;
    }
    if (errorOrData && typeof errorOrData === "object" && !Array.isArray(errorOrData)) {
      this.write("error", message, errorOrData);
      return;
    }
    if (errorOrData !== undefined) {
      this.write("error", message, {
        ...data,
        error: String(errorOrData)
      });
      return;
    }
    this.write("error", message, data);
  }
  async run(operation, action, data) {
    const startedAt = Date.now();
    this.info("Run started", { operation, ...data });
    try {
      const result = await action();
      this.info("Run completed", {
        operation,
        durationMs: Date.now() - startedAt,
        ...data
      });
      return result;
    } catch (error) {
      this.error("Run failed", error, {
        operation,
        durationMs: Date.now() - startedAt,
        ...data
      });
      throw error;
    }
  }
  write(level, message, data) {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }
    const entry = {
      level,
      category: this.category,
      message,
      timestamp: new Date().toISOString(),
      source: captureCallSite(),
      data: data ? sanitizeValue(data) : undefined
    };
    this.store?.add(entry);
    const payload = this.format === "json" ? JSON.stringify(entry) : formatConsoleEntry(entry, this.colorsEnabled);
    if (level === "warn") {
      console.warn(payload);
    } else if (level === "error") {
      console.error(payload);
    } else {
      console.log(payload);
    }
  }
}
function normalizeLogLevel(value) {
  switch (value?.trim().toLowerCase()) {
    case "debug":
    case "warn":
    case "error":
      return value.trim().toLowerCase();
    case "info":
    default:
      return "info";
  }
}
function normalizeLogFormat(value) {
  return value?.trim().toLowerCase() === "json" ? "json" : "pretty";
}
function normalizeLogColors(value) {
  switch (value?.trim().toLowerCase()) {
    case "always":
      return true;
    case "never":
      return false;
    default:
      return supportsAnsiColors();
  }
}

// packages/core/src/logging/logger-factory.ts
var _dec = [
  Singleton()
];
var _init = __decoratorStart(undefined);

class LoggerFactory {
  store;
  constructor(store) {
    this.store = store;
  }
  createLogger(category) {
    return new Logger(typeof category === "string" ? category : category.name || "Anonymous", normalizeLogLevel(process.env["LOG_LEVEL"]), normalizeLogFormat(process.env["LOG_FORMAT"]), normalizeLogColors(process.env["LOG_COLORS"]), this.store);
  }
}
LoggerFactory = __decorateElement(_init, 0, "LoggerFactory", _dec, LoggerFactory);
__runInitializers(_init, 1, LoggerFactory);
__decoratorMetadata(_init, LoggerFactory);
let _LoggerFactory = LoggerFactory;

// packages/core/src/events/event-bus.ts
var _dec = [
  Singleton()
];
var _init = __decoratorStart(undefined);

class EventBus {
  handlers = new Map;
  on(eventName, handler) {
    const handlers = this.handlers.get(eventName) ?? new Set;
    handlers.add(handler);
    this.handlers.set(eventName, handlers);
    return {
      unsubscribe: () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventName);
        }
      }
    };
  }
  once(eventName, handler) {
    let subscription;
    const wrapped = async (event) => {
      subscription?.unsubscribe();
      await handler(event);
    };
    subscription = this.on(eventName, wrapped);
    return subscription;
  }
  async emit(eventName, payload, metadata) {
    const event = {
      name: eventName,
      payload,
      occurredAt: new Date().toISOString(),
      metadata
    };
    for (const handler of this.handlers.get(eventName) ?? []) {
      await handler(event);
    }
  }
}
EventBus = __decorateElement(_init, 0, "EventBus", _dec, EventBus);
__runInitializers(_init, 1, EventBus);
__decoratorMetadata(_init, EventBus);
let _EventBus = EventBus;

// packages/core/src/logging/log-store.ts
var _dec = [
  Singleton()
];
var _init = __decoratorStart(undefined);

class LogStore {
  maxEntries;
  entries = [];
  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }
  add(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }
  list(limit = 200) {
    return this.entries.slice(-Math.max(1, limit));
  }
  clear() {
    this.entries.length = 0;
  }
}
LogStore = __decorateElement(_init, 0, "LogStore", _dec, LogStore);
__runInitializers(_init, 1, LogStore);
__decoratorMetadata(_init, LogStore);
let _LogStore = LogStore;

// packages/core/src/app/gen-app.ts
class GenApp {
  container;
  extensions = new Map;
  started = false;
  stopping = false;
  constructor(options = {}) {
    this.container = new Container;
    this.container.registerInstance(EnvService, new EnvService);
    this.container.registerInstance(EventBus, new EventBus);
    this.container.registerInstance(LogStore, new LogStore);
    this.container.registerInstance(LoggerFactory, new LoggerFactory(this.get(LogStore)));
    for (const extension of options.extensions ?? []) {
      if (this.extensions.has(extension.name)) {
        throw new Error(`Extension '${extension.name}' is already registered.`);
      }
      for (const dependency of extension.dependsOn ?? []) {
        if (!this.extensions.has(dependency)) {
          throw new Error(`Extension '${extension.name}' depends on '${dependency}', which must be registered first.`);
        }
      }
      this.extensions.set(extension.name, extension);
      const result = extension.register?.(this);
      if (result instanceof Promise) {
        throw new Error(`Extension '${extension.name}' uses async register(), which cannot be used through GenApp constructor options. Call app.use() explicitly instead.`);
      }
    }
  }
  async use(extension) {
    if (this.started) {
      throw new Error(`Cannot register extension '${extension.name}' after app.start().`);
    }
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension '${extension.name}' is already registered.`);
    }
    for (const dependency of extension.dependsOn ?? []) {
      if (!this.extensions.has(dependency)) {
        throw new Error(`Extension '${extension.name}' depends on '${dependency}', which must be registered first.`);
      }
    }
    this.extensions.set(extension.name, extension);
    try {
      await extension.register?.(this);
    } catch (error) {
      this.extensions.delete(extension.name);
      throw error;
    }
    return this;
  }
  async start() {
    if (this.started) {
      return;
    }
    for (const extension of this.extensions.values()) {
      await extension.start?.(this);
    }
    this.started = true;
  }
  async stop() {
    if (!this.started && this.extensions.size === 0 || this.stopping) {
      return;
    }
    this.stopping = true;
    try {
      const registered = [...this.extensions.values()].reverse();
      for (const extension of registered) {
        await extension.stop?.(this);
      }
      await this.container.destroy();
      this.started = false;
    } finally {
      this.stopping = false;
    }
  }
  provide(token, instance) {
    this.container.registerInstance(token, instance);
  }
  registerSingleton(token, implementation) {
    this.container.registerSingleton(token, implementation);
  }
  registerScoped(token, implementation) {
    this.container.registerScoped(token, implementation);
  }
  registerTransient(token, implementation) {
    this.container.registerTransient(token, implementation);
  }
  autoRegister(...types) {
    this.container.autoRegister(...types);
  }
  get(token) {
    return this.container.resolve(token);
  }
  createScope() {
    return this.container.createScope();
  }
  hasExtension(name) {
    return this.extensions.has(name);
  }
  listExtensions() {
    return [...this.extensions.keys()];
  }
}

// packages/core/src/app/create-app.ts
function createApp(options) {
  return new GenApp(options);
}
// packages/core/src/result/gen-error.ts
class GenError extends Error {
  code;
  details;
  constructor(message, code = "GENCORE_ERROR", details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "GenError";
  }
}
// packages/ai/src/errors/ai-error.ts
class AiError extends GenError {
  constructor(message, options) {
    super(message, options?.code ?? "AI_ERROR", options?.details);
  }
}

// packages/ai/src/application/services/ai-generation-service.ts
class AiGenerationService {
  registry;
  defaults;
  constructor(registry, defaults) {
    this.registry = registry;
    this.defaults = defaults;
  }
  async generateChat(request) {
    const client = this.resolveChatClient(request.provider);
    if (!client.chat) {
      throw new AiError(`AI client '${client.id}' does not support chat generation.`);
    }
    return client.chat.generateChat(this.applyChatDefaults(request));
  }
  streamChat(request) {
    const client = this.resolveChatClient(request.provider);
    if (!client.chat) {
      throw new AiError(`AI client '${client.id}' does not support chat generation.`);
    }
    return client.chat.streamChat(this.applyChatDefaults(request));
  }
  async generateEmbedding(request) {
    const client = this.resolveEmbeddingClient(request.provider);
    if (!client.embeddings) {
      throw new AiError(`AI client '${client.id}' does not support embeddings.`);
    }
    return client.embeddings.generateEmbedding(this.applyEmbeddingDefaults(request));
  }
  resolveChatClient(provider) {
    const id = provider ?? this.defaults?.chatProvider;
    if (!id) {
      throw new AiError("No chat provider specified. Provide a provider in the request or configure a default chatProvider.");
    }
    return this.registry.get(id);
  }
  resolveEmbeddingClient(provider) {
    const id = provider ?? this.defaults?.embeddingProvider;
    if (!id) {
      throw new AiError("No embedding provider specified. Provide a provider in the request or configure a default embeddingProvider.");
    }
    return this.registry.get(id);
  }
  applyChatDefaults(request) {
    return {
      ...request,
      provider: request.provider ?? this.defaults?.chatProvider,
      model: request.model ?? this.defaults?.chatModel
    };
  }
  applyEmbeddingDefaults(request) {
    return {
      ...request,
      provider: request.provider ?? this.defaults?.embeddingProvider,
      model: request.model ?? this.defaults?.embeddingModel
    };
  }
}

// packages/ai/src/providers/ai-provider-client-registry.ts
class AiProviderClientRegistry {
  clients = new Map;
  register(client) {
    if (this.clients.has(client.id)) {
      throw new AiError(`AI client '${client.id}' is already registered.`);
    }
    this.clients.set(client.id, client);
  }
  get(id) {
    const client = this.clients.get(id);
    if (!client) {
      throw new AiError(`AI client '${id}' is not registered.`);
    }
    return client;
  }
  tryGet(id) {
    return this.clients.get(id) ?? null;
  }
  list() {
    return [...this.clients.values()];
  }
}

// packages/ai/src/extension/ai-extension.ts
function aiExtension(options) {
  return {
    name: "ai",
    register(app) {
      const registry = new AiProviderClientRegistry;
      for (const client of options.clients) {
        registry.register(client);
      }
      const service = new AiGenerationService(registry, options.defaults);
      app.provide(AiProviderClientRegistry, registry);
      app.provide(AiGenerationService, service);
    }
  };
}

// apps/playground-app-ai/src/ai/mock-provider-client.ts
var PROVIDER_ID = "mock";
var PROVIDER_NAME = "Mock Provider";
var DEFAULT_MODEL = "mock-model";
function lastUserText(request) {
  for (let i = request.messages.length - 1;i >= 0; i -= 1) {
    const message = request.messages[i];
    if (message.role !== "user") {
      continue;
    }
    if (typeof message.content === "string") {
      return message.content;
    }
    return message.content.map((part) => part.type === "text" ? part.text : "").join("");
  }
  return "";
}
function createMockProviderClient() {
  return {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    kind: "custom",
    chat: {
      async generateChat(request) {
        const text = lastUserText(request);
        return {
          id: "mock-chat-response",
          provider: PROVIDER_ID,
          model: request.model ?? DEFAULT_MODEL,
          message: {
            role: "assistant",
            content: `Mock reply to: ${text}`
          },
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      },
      async* streamChat(request) {
        const text = lastUserText(request);
        const model = request.model ?? DEFAULT_MODEL;
        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          delta: "Mock "
        };
        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          delta: `reply to: ${text}`
        };
        yield {
          id: "mock-chat-stream",
          provider: PROVIDER_ID,
          model,
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      }
    },
    embeddings: {
      async generateEmbedding(request) {
        const input = typeof request.input === "string" ? request.input : request.input.join(" ");
        const dimensions = 8;
        const embedding = Array.from({ length: dimensions }, (_, i) => input.charCodeAt(i % Math.max(input.length, 1)) % 100 / 100);
        return {
          provider: PROVIDER_ID,
          model: request.model ?? DEFAULT_MODEL,
          embeddings: [{ index: 0, embedding }],
          usage: { inputTokens: 1, totalTokens: 1 }
        };
      }
    },
    supportsChat() {
      return true;
    },
    supportsEmbeddings() {
      return true;
    }
  };
}

// apps/playground-app-ai/src/playground-ai-app.ts
async function createPlaygroundAiApp(options = {}) {
  const app = createApp();
  const clients = options.clients ?? [createMockProviderClient()];
  const firstClientId = clients[0]?.id ?? "mock";
  const defaults = options.defaults ?? {
    chatProvider: firstClientId,
    chatModel: "mock-model",
    embeddingProvider: firstClientId,
    embeddingModel: "mock-model"
  };
  await app.use(aiExtension({
    clients,
    defaults
  }));
  return app;
}

// apps/playground-app-ai/src/ai/providers.ts
import path2 from "path";

// packages/ai/src/application/tools/ai-tool-executor.ts
class AiToolExecutor {
  async execute(toolCall, tools, context = {}) {
    const tool = tools.find((candidate) => candidate.name === toolCall.name);
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' was not found.`,
        raw: toolCall.raw
      };
    }
    if (!tool.execute) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' is not executable.`,
        raw: toolCall.raw
      };
    }
    try {
      const result = await tool.execute(toolCall.arguments, {
        ...context,
        toolCallId: toolCall.id,
        toolName: toolCall.name
      });
      const convertedResult = tool.resultConverter ? tool.resultConverter(result) : result;
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: convertedResult,
        raw: toolCall.raw
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: error instanceof Error ? error.message : String(error),
        raw: toolCall.raw
      };
    }
  }
}

// packages/ai/src/application/tools/ai-tool-calling-manager.ts
class AiToolCallingManager {
  executor;
  constructor(executor = new AiToolExecutor) {
    this.executor = executor;
  }
  async run(input) {
    const toolResults = [];
    for (const toolCall of input.toolCalls) {
      const result = await this.executor.execute(toolCall, input.tools, {
        provider: input.provider,
        model: input.model,
        userId: input.userId,
        metadata: input.metadata,
        signal: input.signal
      });
      toolResults.push(result);
      const tool = input.tools.find((candidate) => candidate.name === toolCall.name);
      if (tool?.returnDirect) {
        return {
          toolResults,
          returnDirectResult: result.result ?? result.error
        };
      }
    }
    return { toolResults };
  }
}

// packages/ai/src/providers/ollama/ollama-chat-generator.ts
import { Ollama } from "ollama";
function toOllamaImage(data) {
  if (typeof data === "string") {
    const match = /^data:[^;]+;base64,(.*)$/s.exec(data);
    return match ? match[1] : data;
  }
  if (data instanceof URL) {
    return;
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Buffer.from(bytes).toString("base64");
}

class OllamaChatGenerator {
  options;
  client;
  toolCallingManager = new AiToolCallingManager;
  constructor(options) {
    this.options = options;
    this.client = new Ollama({
      host: options.host,
      fetch: options.fetch,
      proxy: options.proxy,
      headers: options.headers
    });
  }
  async generateChat(request) {
    const modelId = this.resolveModelId(request);
    const maxToolSteps = request.settings?.maxToolSteps ?? 1;
    const messages = this.convertToOllamaMessages(request.messages);
    const tools = this.buildOllamaTools(request);
    const allToolCalls = [];
    const allToolResults = [];
    const requestBase = {
      model: modelId,
      tools,
      ...this.buildChatOptions(request)
    };
    let response = await this.client.chat({
      ...requestBase,
      messages,
      stream: false
    });
    for (let step = 0;step < maxToolSteps; step++) {
      const toolCalls = this.extractOllamaToolCalls(response.message?.tool_calls ?? response);
      if (toolCalls.length === 0)
        break;
      allToolCalls.push(...toolCalls);
      const results = [];
      for (const toolCall of toolCalls) {
        const toolRun = await this.toolCallingManager.run({
          toolCalls: [toolCall],
          tools: request.tools ?? [],
          provider: this.options.id,
          model: modelId,
          userId: request.userId,
          metadata: request.metadata,
          signal: request.signal ?? request.settings?.signal
        });
        const result = toolRun.toolResults[0];
        if (result) {
          results.push(result);
        }
      }
      allToolResults.push(...results);
      if (response.message) {
        messages.push(response.message);
      }
      for (const result of results) {
        messages.push(this.createOllamaToolResultMessage(result));
      }
      response = await this.client.chat({
        ...requestBase,
        messages,
        stream: false
      });
    }
    return {
      ...this.toCompletionResponse(response, modelId),
      toolCalls: allToolCalls.length ? allToolCalls : undefined,
      toolResults: allToolResults.length ? allToolResults : undefined
    };
  }
  async* streamChat(request) {
    const modelId = this.resolveModelId(request);
    if (!request.tools || request.tools.length === 0) {
      yield* this.simpleStream(request, modelId);
      return;
    }
    yield* this.toolStream(request, modelId);
  }
  async* simpleStream(request, modelId) {
    const stream = await this.client.chat({
      model: modelId,
      messages: this.convertToOllamaMessages(request.messages),
      stream: true,
      ...this.buildChatOptions(request)
    });
    const responseId = crypto.randomUUID();
    for await (const part of stream) {
      yield this.toStreamChunk(part, modelId, responseId);
    }
  }
  async* toolStream(request, modelId) {
    const maxToolSteps = request.settings?.maxToolSteps ?? 1;
    const messages = this.convertToOllamaMessages(request.messages);
    const tools = this.buildOllamaTools(request);
    const responseId = crypto.randomUUID();
    const requestBase = {
      model: modelId,
      tools,
      ...this.buildChatOptions(request)
    };
    for (let step = 0;step < maxToolSteps; step++) {
      const stepToolCalls = [];
      const seenStepToolCallKeys = new Set;
      let assistantMessage;
      const stream = await this.client.chat({
        ...requestBase,
        messages,
        stream: true
      });
      for await (const part of stream) {
        const chunk = this.toStreamChunk(part, modelId, responseId);
        yield chunk;
        const toolCalls = this.extractOllamaToolCalls(part.message?.tool_calls ?? part);
        if (toolCalls.length > 0) {
          assistantMessage = part.message;
          for (const toolCall of toolCalls) {
            const toolCallKey = this.createToolCallKey(toolCall);
            if (seenStepToolCallKeys.has(toolCallKey)) {
              this.debugLog("Suppressing duplicate streamed tool call.", {
                modelId,
                toolName: toolCall.name,
                toolCallId: toolCall.id,
                step
              });
              continue;
            }
            seenStepToolCallKeys.add(toolCallKey);
            stepToolCalls.push(toolCall);
          }
        }
      }
      if (stepToolCalls.length === 0)
        break;
      if (assistantMessage) {
        messages.push(assistantMessage);
      }
      for (const toolCall of stepToolCalls) {
        this.debugLog("Starting server tool execution.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step
        });
        yield {
          id: responseId,
          type: "tool_call_delta",
          provider: this.options.id,
          model: modelId,
          toolCall,
          raw: toolCall.raw
        };
        const toolRun = await this.toolCallingManager.run({
          toolCalls: [toolCall],
          tools: request.tools ?? [],
          provider: this.options.id,
          model: modelId,
          userId: request.userId,
          metadata: request.metadata,
          signal: request.signal ?? request.settings?.signal
        });
        const result = toolRun.toolResults[0] ?? {
          toolCallId: toolCall.id,
          name: toolCall.name,
          error: `Tool '${toolCall.name}' execution returned no result.`,
          raw: toolCall.raw
        };
        this.debugLog("Finished server tool execution.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step,
          hasError: Boolean(result.error)
        });
        yield {
          id: responseId,
          type: "tool_result_delta",
          provider: this.options.id,
          model: modelId,
          toolResult: result,
          raw: result.raw
        };
        this.debugLog("Enqueued tool_result_delta.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step,
          hasError: Boolean(result.error)
        });
        messages.push(this.createOllamaToolResultMessage(result));
      }
      this.debugLog("Resuming model loop after tool result append.", {
        modelId,
        step,
        toolCallCount: stepToolCalls.length
      });
    }
  }
  createToolCallKey(toolCall) {
    return `${toolCall.name}:${this.stableStringify(toolCall.arguments)}`;
  }
  stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entryValue]) => `${JSON.stringify(key)}:${this.stableStringify(entryValue)}`);
      return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
  }
  debugLog(message, details) {
    if (false) {}
    console.info("[OllamaChatGenerator]", message, details);
  }
  resolveModelId(request) {
    const id = request.model ?? this.options.defaultModel;
    if (!id) {
      throw new AiError("No model specified. Provide a model in the request or set a defaultModel in client options.");
    }
    return id;
  }
  buildOllamaTools(request) {
    if (!request.tools || request.tools.length === 0)
      return;
    return request.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ?? {
          type: "object",
          properties: {}
        }
      }
    }));
  }
  extractOllamaToolCalls(value) {
    if (!value)
      return [];
    let calls = [];
    if (Array.isArray(value)) {
      calls = value;
    } else if (typeof value === "object") {
      const record = value;
      if (Array.isArray(record.tool_calls)) {
        calls = record.tool_calls;
      } else if (Array.isArray(record.message)) {
        calls = record.message;
      }
    }
    return calls.map((c) => {
      if (!c || typeof c !== "object")
        return;
      const obj = c;
      const id = typeof obj.id === "string" ? obj.id : "";
      const fn = typeof obj.function === "object" && obj.function ? obj.function : null;
      const name = typeof obj.name === "string" ? obj.name : fn?.name ?? "";
      const args = fn?.arguments ?? obj.arguments ?? obj.input ?? {};
      if (!name)
        return;
      return {
        id: id || crypto.randomUUID(),
        name,
        arguments: typeof args === "string" ? this.safeParseJson(args) : args,
        raw: c
      };
    }).filter(Boolean);
  }
  safeParseJson(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  createOllamaToolResultMessage(result) {
    const content = result.error ? JSON.stringify({ error: result.error }) : JSON.stringify(result.result);
    return {
      role: "tool",
      content,
      tool_call_id: result.toolCallId
    };
  }
  buildChatOptions(request) {
    const opts = {};
    if (request.settings?.reasoningEffort) {
      opts.think = this.mapReasoningEffort(request.settings.reasoningEffort);
    }
    const options = {};
    if (request.settings?.temperature !== undefined) {
      options.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      options.top_p = request.settings.topP;
    }
    if (request.settings?.maxTokens !== undefined) {
      options.num_predict = request.settings.maxTokens;
    }
    if (request.settings?.stop) {
      options.stop = request.settings.stop;
    }
    if (Object.keys(options).length > 0) {
      opts.options = options;
    }
    return opts;
  }
  mapReasoningEffort(effort) {
    switch (effort) {
      case "high":
      case "xhigh":
        return "high";
      case "medium":
        return "medium";
      case "low":
      case "minimal":
        return "low";
      case "none":
        return false;
      default:
        return true;
    }
  }
  convertToOllamaMessages(messages) {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }
      const textParts = [];
      const images = [];
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text);
        } else if (part.type === "image") {
          const base64 = toOllamaImage(part.data);
          if (base64) {
            images.push(base64);
          } else {
            textParts.push(JSON.stringify(part));
          }
        } else if (part.type === "file") {
          if (part.mediaType.startsWith("image/")) {
            const base64 = toOllamaImage(part.data);
            if (base64) {
              images.push(base64);
            } else {
              textParts.push(JSON.stringify(part));
            }
          } else {
            textParts.push(JSON.stringify(part));
          }
        } else {
          textParts.push(JSON.stringify(part));
        }
      }
      const message = {
        role: msg.role,
        content: textParts.join("")
      };
      if (images.length > 0) {
        message.images = images;
      }
      return message;
    });
  }
  toCompletionResponse(response, modelId) {
    return {
      id: crypto.randomUUID(),
      provider: this.options.id,
      model: modelId,
      message: {
        role: "assistant",
        content: response.message.content
      },
      finishReason: this.mapDoneReason(response.done_reason),
      usage: this.mapUsage(response),
      raw: response
    };
  }
  toStreamChunk(part, modelId, responseId) {
    const chunk = {
      id: responseId,
      provider: this.options.id,
      model: modelId,
      raw: part
    };
    if (part.message.content) {
      chunk.type = "text_delta";
      chunk.delta = part.message.content;
    }
    if (part.message.thinking) {
      chunk.type = "reasoning_delta";
      chunk.reasoningDelta = part.message.thinking;
    }
    if (part.done) {
      chunk.type = "finish";
      chunk.finishReason = this.mapDoneReason(part.done_reason);
      chunk.usage = this.mapUsage(part);
    }
    return chunk;
  }
  mapDoneReason(reason) {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "load":
      case "unload":
        return "error";
      default:
        return reason || "stop";
    }
  }
  mapUsage(response) {
    if (!response.prompt_eval_count && !response.eval_count) {
      return;
    }
    return {
      inputTokens: response.prompt_eval_count || undefined,
      outputTokens: response.eval_count || undefined,
      totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0) || undefined
    };
  }
}

// packages/ai/src/providers/ollama/ollama-embedding-generator.ts
import { Ollama as Ollama2 } from "ollama";

class OllamaEmbeddingGenerator {
  options;
  client;
  constructor(options) {
    this.options = options;
    this.client = new Ollama2({
      host: options.host,
      fetch: options.fetch,
      proxy: options.proxy,
      headers: options.headers
    });
  }
  async generateEmbedding(request) {
    const modelId = request.model ?? this.options.defaultModel;
    if (!modelId) {
      throw new AiError("No embedding model specified. Provide a model in the request or set a defaultModel in client options.");
    }
    const response = await this.client.embed({
      model: modelId,
      input: request.input,
      dimensions: request.dimensions
    });
    return {
      provider: this.options.id,
      model: modelId,
      embeddings: response.embeddings.map((embedding, i) => ({
        index: i,
        embedding
      })),
      usage: response.prompt_eval_count ? {
        inputTokens: response.prompt_eval_count,
        totalTokens: response.prompt_eval_count
      } : undefined,
      raw: response
    };
  }
}

// packages/ai/src/providers/ollama/ollama-client.ts
class OllamaClient {
  id;
  name;
  kind = "ollama";
  chat;
  embeddings;
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.chat = new OllamaChatGenerator(options);
    this.embeddings = new OllamaEmbeddingGenerator(options);
  }
  supportsChat() {
    return true;
  }
  supportsEmbeddings() {
    return true;
  }
}
// packages/ai/src/application/tools/ai-tool-utils.ts
function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}
function readStringField(value, keys) {
  if (!isRecord(value))
    return;
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string")
      return field;
  }
  return;
}
function readUnknownField(value, keys) {
  if (!isRecord(value))
    return;
  for (const key of keys) {
    if (key in value)
      return value[key];
  }
  return;
}
function createToolCallFromUnknown(value) {
  const id = readStringField(value, [
    "toolCallId",
    "id"
  ]) ?? crypto.randomUUID();
  const name = readStringField(value, ["toolName", "name"]);
  if (!name)
    return;
  const args = readUnknownField(value, ["input", "args", "arguments"]) ?? {};
  return {
    id,
    name,
    arguments: args,
    raw: value
  };
}
function createToolResultFromUnknown(value) {
  const toolCallId = readStringField(value, ["toolCallId", "id"]) ?? "";
  const name = readStringField(value, ["toolName", "name"]) ?? "";
  if (!toolCallId && !name)
    return;
  const result = readUnknownField(value, ["output", "result"]);
  return {
    toolCallId,
    name,
    result,
    raw: value
  };
}

// packages/ai/src/application/model-transforms/deepseek.ts
function deepseekTransform(request) {
  const effort = request.settings?.reasoningEffort;
  if (!effort)
    return;
  if (effort === "none" || effort === "minimal") {
    return {
      providerOptions: {
        thinking: { type: "disabled" }
      }
    };
  }
  const reasoningEffort = effort === "xhigh" ? "max" : "high";
  return {
    providerOptions: {
      thinking: { type: "enabled" },
      reasoningEffort
    }
  };
}

// packages/ai/src/application/model-transforms/registry.ts
var MODEL_TRANSFORMS = {
  "deepseek-v4": deepseekTransform,
  "deepseek-chat": deepseekTransform,
  "deepseek-reasoner": deepseekTransform
};
function normalizeModelId(modelId) {
  return modelId.toLowerCase();
}
function applyModelTransform(modelId, request) {
  if (!modelId)
    return;
  const key = normalizeModelId(modelId);
  for (const [pattern, transform] of Object.entries(MODEL_TRANSFORMS)) {
    if (key.startsWith(pattern)) {
      return transform(request);
    }
  }
  return;
}
// packages/ai/src/providers/openai-compatible/openai-compatible-chat-generator.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  generateText,
  streamText,
  stepCountIs,
  jsonSchema
} from "ai";

class OpenAICompatibleChatGenerator {
  options;
  constructor(options) {
    this.options = options;
  }
  async generateChat(request) {
    const provider = this.createProvider(request.apiKey);
    const modelId = this.resolveModelId(request);
    const model = provider.chatModel(modelId);
    const messages = this.convertToModelMessages(request.messages);
    const hasSystemMessage = request.messages.some((m) => m.role === "system");
    const result = await generateText({
      model,
      messages,
      allowSystemInMessages: hasSystemMessage || undefined,
      maxOutputTokens: request.settings?.maxTokens,
      temperature: request.settings?.temperature,
      topP: request.settings?.topP,
      stopSequences: request.settings?.stop,
      abortSignal: request.signal ?? request.settings?.signal,
      providerOptions: this.buildProviderOptions(request),
      tools: this.buildTools(request, modelId),
      toolChoice: this.buildToolChoice(request),
      stopWhen: this.buildStopWhen(request)
    });
    return {
      id: crypto.randomUUID(),
      provider: this.options.id,
      model: modelId,
      message: {
        role: "assistant",
        content: result.text
      },
      finishReason: this.mapFinishReason(result.finishReason),
      usage: this.mapUsage(result.usage),
      toolCalls: result.toolCalls?.length ? result.toolCalls.map((tc) => createToolCallFromUnknown(tc)).filter(Boolean) : undefined,
      toolResults: result.toolResults?.length ? result.toolResults.map((tr) => createToolResultFromUnknown(tr)).filter(Boolean) : undefined,
      raw: result
    };
  }
  async* streamChat(request) {
    const provider = this.createProvider(request.apiKey);
    const modelId = this.resolveModelId(request);
    const model = provider.chatModel(modelId);
    const messages = this.convertToModelMessages(request.messages);
    const hasSystemMessage = request.messages.some((m) => m.role === "system");
    const result = streamText({
      model,
      messages,
      allowSystemInMessages: hasSystemMessage || undefined,
      maxOutputTokens: request.settings?.maxTokens,
      temperature: request.settings?.temperature,
      topP: request.settings?.topP,
      stopSequences: request.settings?.stop,
      abortSignal: request.signal ?? request.settings?.signal,
      providerOptions: this.buildProviderOptions(request),
      tools: this.buildTools(request, modelId),
      toolChoice: this.buildToolChoice(request),
      stopWhen: this.buildStopWhen(request)
    });
    const responseId = crypto.randomUUID();
    for await (const part of result.stream) {
      switch (part.type) {
        case "text-delta":
          yield {
            id: responseId,
            type: "text_delta",
            provider: this.options.id,
            model: modelId,
            delta: part.text,
            raw: part
          };
          break;
        case "reasoning-delta":
          yield {
            id: responseId,
            type: "reasoning_delta",
            provider: this.options.id,
            model: modelId,
            reasoningDelta: part.text,
            raw: part
          };
          break;
        case "tool-call": {
          const toolCall = createToolCallFromUnknown(part);
          if (toolCall) {
            yield {
              id: responseId,
              type: "tool_call_delta",
              provider: this.options.id,
              model: modelId,
              toolCall,
              raw: part
            };
          }
          break;
        }
        case "tool-result": {
          const toolResult = createToolResultFromUnknown(part);
          if (toolResult) {
            yield {
              id: responseId,
              type: "tool_result_delta",
              provider: this.options.id,
              model: modelId,
              toolResult,
              raw: part
            };
          }
          break;
        }
        case "finish":
          yield {
            id: responseId,
            type: "finish",
            provider: this.options.id,
            model: modelId,
            finishReason: this.mapFinishReason(part.finishReason),
            usage: this.mapUsage(part.totalUsage),
            raw: part
          };
          break;
        case "error":
          throw new AiError(typeof part.error === "string" ? part.error : "Stream error from provider");
      }
    }
  }
  buildTools(request, modelId) {
    if (!request.tools || request.tools.length === 0)
      return;
    const tools = {};
    for (const toolDef of request.tools) {
      tools[toolDef.name] = this.toSdkTool(toolDef, request, modelId);
    }
    return tools;
  }
  toSdkTool(toolDef, request, modelId) {
    const base = {
      description: toolDef.description,
      inputSchema: toolDef.parameters ? jsonSchema(toolDef.parameters) : jsonSchema({ type: "object" })
    };
    if (toolDef.execute) {
      base.execute = async (args) => {
        return toolDef.execute(args, {
          toolCallId: "",
          toolName: toolDef.name,
          provider: this.options.id,
          model: modelId,
          userId: request.userId,
          metadata: request.metadata,
          signal: request.signal ?? request.settings?.signal
        });
      };
    }
    return base;
  }
  buildToolChoice(request) {
    const choice = request.settings?.toolChoice;
    if (!choice || choice === "auto")
      return;
    return choice;
  }
  buildStopWhen(request) {
    const maxSteps = request.settings?.maxToolSteps;
    if (!request.tools || request.tools.length === 0)
      return;
    if (maxSteps === undefined || maxSteps <= 1)
      return;
    return stepCountIs(maxSteps);
  }
  resolveModelId(request) {
    const id = request.model ?? this.options.defaultModel;
    if (!id) {
      throw new AiError("No model specified. Provide a model in the request or set a defaultModel in client options.");
    }
    return id;
  }
  createProvider(apiKey) {
    return createOpenAICompatible({
      name: this.options.id,
      baseURL: this.options.baseURL,
      apiKey: apiKey ?? this.options.apiKey,
      headers: this.options.headers,
      queryParams: this.options.queryParams,
      includeUsage: this.options.includeUsage,
      supportsStructuredOutputs: this.options.supportsStructuredOutputs,
      fetch: this.options.fetch
    });
  }
  buildProviderOptions(request) {
    const providerOpts = {};
    const modelId = request.model ?? this.options.defaultModel;
    const transform = applyModelTransform(modelId, request);
    if (transform?.providerOptions) {
      Object.assign(providerOpts, transform.providerOptions);
    } else if (request.settings?.reasoningEffort) {
      providerOpts.reasoningEffort = request.settings.reasoningEffort;
    }
    if (request.userId) {
      providerOpts.user = request.userId;
    }
    if (Object.keys(providerOpts).length === 0) {
      return;
    }
    return { [this.options.id]: providerOpts };
  }
  convertToModelMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role,
      content: this.convertContent(msg.content),
      ...msg.name ? { name: msg.name } : {}
    }));
  }
  convertContent(content) {
    if (typeof content === "string") {
      return content;
    }
    return content.filter((part) => part.type !== "thinking").map((part) => this.convertContentPart(part));
  }
  convertContentPart(part) {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "image":
        return {
          type: "image",
          image: part.data,
          mediaType: part.mediaType
        };
      case "tool_call":
        return {
          type: "tool-call",
          toolCallId: part.id,
          toolName: part.name,
          input: part.arguments
        };
      case "tool_result":
        return {
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: "",
          output: typeof part.content === "string" ? { type: "text", value: part.content } : { type: "json", value: part.content }
        };
      case "file":
        return {
          type: "file",
          data: part.data,
          mediaType: part.mediaType,
          ...part.filename ? { filename: part.filename } : {}
        };
      default:
        return { type: "text", text: JSON.stringify(part) };
    }
  }
  mapFinishReason(reason) {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "tool-calls":
        return "tool_use";
      case "content-filter":
        return "error";
      case "error":
        return "error";
      default:
        return reason;
    }
  }
  mapUsage(usage) {
    if (!usage) {
      return;
    }
    const inputTokenDetails = this.mapTokenDetails(usage.inputTokenDetails);
    const outputTokenDetails = this.mapTokenDetails(usage.outputTokenDetails);
    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cacheReadTokens: inputTokenDetails?.cacheReadTokens,
      cacheWriteTokens: inputTokenDetails?.cacheWriteTokens,
      inputTokenDetails,
      outputTokenDetails
    };
  }
  mapTokenDetails(details) {
    if (!details || typeof details !== "object") {
      return;
    }
    const mapped = {};
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === "number") {
        mapped[key] = value;
      }
    }
    return Object.keys(mapped).length > 0 ? mapped : undefined;
  }
}

// packages/ai/src/providers/openai-compatible/openai-compatible-embedding-generator.ts
import { createOpenAICompatible as createOpenAICompatible2 } from "@ai-sdk/openai-compatible";
import { embed, embedMany } from "ai";

class OpenAICompatibleEmbeddingGenerator {
  options;
  constructor(options) {
    this.options = options;
  }
  async generateEmbedding(request) {
    const modelId = request.model ?? this.options.defaultModel;
    if (!modelId) {
      throw new AiError("No embedding model specified. Provide a model in the request or set a defaultModel in client options.");
    }
    const provider = this.createProvider(request.apiKey);
    const model = provider.embeddingModel(modelId);
    if (Array.isArray(request.input)) {
      const result2 = await embedMany({
        model,
        values: request.input,
        abortSignal: request.signal
      });
      return {
        provider: this.options.id,
        model: modelId,
        embeddings: result2.embeddings.map((e, i) => ({
          index: i,
          embedding: e
        })),
        usage: result2.usage ? {
          inputTokens: result2.usage.tokens,
          totalTokens: result2.usage.tokens
        } : undefined,
        raw: result2
      };
    }
    const result = await embed({
      model,
      value: request.input,
      abortSignal: request.signal
    });
    return {
      provider: this.options.id,
      model: modelId,
      embeddings: [{ index: 0, embedding: result.embedding }],
      usage: result.usage ? {
        inputTokens: result.usage.tokens,
        totalTokens: result.usage.tokens
      } : undefined,
      raw: result
    };
  }
  createProvider(apiKey) {
    return createOpenAICompatible2({
      name: this.options.id,
      baseURL: this.options.baseURL,
      apiKey: apiKey ?? this.options.apiKey,
      headers: this.options.headers,
      queryParams: this.options.queryParams,
      fetch: this.options.fetch
    });
  }
}

// packages/ai/src/providers/openai-compatible/openai-compatible-client.ts
class OpenAICompatibleClient {
  id;
  name;
  kind = "openai-compatible";
  chat;
  embeddings;
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.chat = new OpenAICompatibleChatGenerator(options);
    this.embeddings = new OpenAICompatibleEmbeddingGenerator(options);
  }
  supportsChat() {
    return true;
  }
  supportsEmbeddings() {
    return true;
  }
}
// apps/playground-app-ai/src/ai/providers.ts
function bearerHeadersFromEnv(env, name) {
  const apiKey = env[name]?.trim();
  if (!apiKey) {
    return;
  }
  return { Authorization: `Bearer ${apiKey}` };
}
function optionalEnv(env, name) {
  const value = env[name]?.trim();
  return value || undefined;
}
function splitModelsCsv(value) {
  if (!value) {
    return;
  }
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}
var OLLAMA_DEFAULT_CAPABILITIES = {
  inputModalities: ["text", "image"],
  reasoning: true,
  toolCall: true
};
var OLLAMA_DEFAULT_IMAGE_PATH = path2.resolve(import.meta.dirname, "../../../../data/test-directory/images/arabervollblut-horse-10333771.jpg");
var OLLAMA_VISION_PROMPT = "What animal is in this image? Answer with one word.";
var OLLAMA_VISION_EXPECTED = "horse";
var DEEPSEEK_DEFAULT_CAPABILITIES = {
  inputModalities: ["text"],
  reasoning: true,
  toolCall: true
};
function createAiAppProvidersFromEnv(env = process.env) {
  const ollamaHost = optionalEnv(env, "OLLAMA_HOST") ?? "http://127.0.0.1:11434";
  const ollamaChatModels = splitModelsCsv(env.OLLAMA_CHAT_MODELS) ?? [optionalEnv(env, "OLLAMA_CHAT_MODEL") ?? "gemma4:12b"];
  const ollamaChatModel = ollamaChatModels[0] ?? "gemma4:12b";
  const ollamaEmbedModel = optionalEnv(env, "OLLAMA_EMBED_MODEL") ?? "embeddinggemma:latest";
  const configs = [
    {
      client: new OllamaClient({
        id: "ollama",
        name: "Ollama",
        host: ollamaHost,
        headers: bearerHeadersFromEnv(env, "OLLAMA_API_KEY"),
        defaultModel: ollamaChatModel
      }),
      chatModel: ollamaChatModel,
      chatModels: ollamaChatModels,
      embeddingModel: ollamaEmbedModel,
      supportsEmbedding: true,
      defaultModelCapabilities: OLLAMA_DEFAULT_CAPABILITIES,
      imagePath: OLLAMA_DEFAULT_IMAGE_PATH,
      visionPrompt: OLLAMA_VISION_PROMPT,
      visionExpected: OLLAMA_VISION_EXPECTED
    }
  ];
  const deepseekApiKey = optionalEnv(env, "DEEPSEEK_API_KEY");
  if (deepseekApiKey) {
    const deepseekChatModels = splitModelsCsv(env.DEEPSEEK_CHAT_MODELS) ?? [optionalEnv(env, "DEEPSEEK_CHAT_MODEL") ?? "deepseek-v4-flash"];
    const deepseekChatModel = deepseekChatModels[0] ?? "deepseek-v4-flash";
    const deepseekEmbedModel = optionalEnv(env, "DEEPSEEK_EMBED_MODEL");
    configs.push({
      client: new OpenAICompatibleClient({
        id: "deepseek",
        name: "DeepSeek",
        baseURL: optionalEnv(env, "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1",
        apiKey: deepseekApiKey
      }),
      chatModel: deepseekChatModel,
      chatModels: deepseekChatModels,
      embeddingModel: deepseekEmbedModel,
      supportsEmbedding: Boolean(deepseekEmbedModel),
      defaultModelCapabilities: DEEPSEEK_DEFAULT_CAPABILITIES
    });
  }
  const filter = optionalEnv(env, "AI_APP_PROVIDER");
  if (filter) {
    const allowed = new Set(filter.split(",").map((id) => id.trim().toLowerCase()).filter(Boolean));
    return configs.filter((config) => allowed.has(config.client.id.toLowerCase()));
  }
  return configs;
}

// apps/playground-app-ai/src/verify/shared/logger.ts
import { mkdirSync } from "fs";
import path3 from "path";
function createTimestamp() {
  const date = new Date;
  const pad = (value) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}
function createAppAiLogger(options) {
  const baseDir = options.logDir ?? path3.resolve(import.meta.dirname, "../../../../../data/logs/app-ai");
  const logDir = path3.join(baseDir, options.provider);
  mkdirSync(logDir, { recursive: true });
  const logPath = path3.join(logDir, `${options.filePrefix}-${createTimestamp()}.log`);
  const writer = Bun.file(logPath).writer();
  return {
    logPath,
    log(message) {
      console.log(message);
      writer.write(`${message}
`);
    },
    async close() {
      await writer.end();
    }
  };
}
// apps/playground-app-ai/src/verify/shared/formatters.ts
function extractText(content) {
  if (typeof content === "string") {
    return content;
  }
  return content.map((part) => part.type === "text" ? part.text : "").join("");
}
function summarizeContent(content) {
  if (typeof content === "string") {
    return content;
  }
  return content.map((part) => {
    if (part.type === "image") {
      return { type: "image", mediaType: part.mediaType, bytes: part.data.length };
    }
    if (part.type === "file") {
      return { type: "file", mediaType: part.mediaType, filename: part.filename };
    }
    return part;
  });
}
function logRequest(logger, request) {
  logger.log("  Request:");
  logger.log(`    model: ${request.model ?? "(default)"}`);
  logger.log(`    provider: ${request.provider ?? "(default)"}`);
  if ("messages" in request) {
    const messages = request.messages.map((message) => ({
      role: message.role,
      name: message.name,
      content: summarizeContent(message.content)
    }));
    logger.log(`    messages: ${JSON.stringify(messages)}`);
    if (request.settings) {
      logger.log(`    settings: ${JSON.stringify(request.settings)}`);
    }
    if (request.tools?.length) {
      logger.log(`    tools: ${request.tools.map((tool) => tool.name).join(", ")}`);
    }
    return;
  }
  logger.log(`    input: ${JSON.stringify(request.input)}`);
  if (request.dimensions) {
    logger.log(`    dimensions: ${request.dimensions}`);
  }
}
function formatChunk(chunk) {
  const parts = ["[chunk]"];
  if (chunk.type)
    parts.push(`type=${chunk.type}`);
  if (chunk.delta)
    parts.push(`delta=${JSON.stringify(chunk.delta)}`);
  if (chunk.reasoningDelta) {
    parts.push(`reasoning=${JSON.stringify(chunk.reasoningDelta)}`);
  }
  if (chunk.toolCall)
    parts.push(`toolCall=${JSON.stringify(chunk.toolCall)}`);
  if (chunk.toolResult) {
    parts.push(`toolResult=${JSON.stringify(chunk.toolResult)}`);
  }
  if (chunk.finishReason)
    parts.push(`finishReason=${chunk.finishReason}`);
  if (chunk.usage) {
    parts.push(`usage={input:${chunk.usage.inputTokens},output:${chunk.usage.outputTokens},total:${chunk.usage.totalTokens}}`);
  }
  if (chunk.message) {
    parts.push(`message=${JSON.stringify(chunk.message)}`);
  }
  return parts.join(" ");
}
function isEmptyChunk(chunk) {
  return !(chunk.type || chunk.delta || chunk.reasoningDelta || chunk.toolCall || chunk.toolResult || chunk.finishReason || chunk.usage || chunk.message);
}
function createEmptyChatStreamSummary() {
  return {
    fullText: "",
    fullReasoning: "",
    toolCallCount: 0,
    toolResultCount: 0,
    finishCount: 0,
    emptyChunkCount: 0
  };
}
function applyChunkToSummary(summary, chunk, collectReasoning = false) {
  if (chunk.delta) {
    summary.fullText += chunk.delta;
  }
  if (collectReasoning && chunk.reasoningDelta) {
    summary.fullReasoning += chunk.reasoningDelta;
  }
  if (chunk.toolCall) {
    summary.toolCallCount += 1;
  }
  if (chunk.toolResult) {
    summary.toolResultCount += 1;
  }
  if (chunk.type === "finish" || chunk.finishReason) {
    summary.finishCount += 1;
  }
  if (isEmptyChunk(chunk)) {
    summary.emptyChunkCount += 1;
  }
}
function logStreamSummary(logger, summary) {
  logger.log(`  Full text: ${JSON.stringify(summary.fullText)}`);
  if (summary.fullReasoning) {
    logger.log(`  Full reasoning: ${JSON.stringify(summary.fullReasoning)}`);
  }
  logger.log(`  Tool calls: ${summary.toolCallCount}`);
  logger.log(`  Tool results: ${summary.toolResultCount}`);
  logger.log(`  Finish chunks: ${summary.finishCount}`);
  logger.log(`  Empty chunks: ${summary.emptyChunkCount}`);
}
// apps/playground-app-ai/src/verify/shared/images.ts
import { deflateSync } from "zlib";
import path4 from "path";
var PNG_SIGNATURE = Buffer.from([
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10
]);
var CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0;n < 256; n += 1) {
    let current = n;
    for (let bit = 0;bit < 8; bit += 1) {
      current = (current & 1) === 1 ? 3988292384 ^ current >>> 1 : current >>> 1;
    }
    table[n] = current >>> 0;
  }
  return table;
})();
function crc32(buffer) {
  let current = 4294967295;
  for (let i = 0;i < buffer.length; i += 1) {
    current = CRC_TABLE[(current ^ buffer[i]) & 255] ^ current >>> 8;
  }
  return (current ^ 4294967295) >>> 0;
}
function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}
function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = u32(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([u32(data.length), typeBuffer, data, crc]);
}
function createSolidColorPngBase64(width, height, rgb) {
  const [r, g, b] = rgb;
  const pixel = Buffer.from([r, g, b]);
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: width }, () => Buffer.from(pixel)))
  ]);
  const raw = Buffer.concat(Array.from({ length: height }, () => Buffer.from(row)));
  const ihdr = pngChunk("IHDR", Buffer.concat([
    u32(width),
    u32(height),
    Buffer.from([8, 2, 0, 0, 0])
  ]));
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([PNG_SIGNATURE, ihdr, idat, iend]).toString("base64");
}
function createImagePartFromBase64(base64, mediaType = "image/png") {
  return { type: "image", data: base64, mediaType };
}
function createDefaultImagePart() {
  return createImagePartFromBase64(createSolidColorPngBase64(32, 32, [255, 0, 0]));
}
var MIME_BY_EXTENSION = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif"
};
async function createLocalImagePart(filePath) {
  const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
  const extension = path4.extname(filePath).toLowerCase();
  const mediaType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
  return { type: "image", data: buffer.toString("base64"), mediaType };
}
// packages/ai/src/catalogue/ai-catalogue.ts
class AiCatalogue {
  data;
  constructor(data) {
    this.data = data;
  }
  get providers() {
    return this.data.providers;
  }
  get models() {
    return this.data.models;
  }
  get labs() {
    return this.data.labs;
  }
  getProvider(id) {
    return this.data.providers[id];
  }
  getModel(id) {
    return this.data.models[id];
  }
  getLab(id) {
    return this.data.labs[id];
  }
  listProviders(filter) {
    const providers = Object.values(this.data.providers);
    if (!filter) {
      return providers;
    }
    return providers.filter((provider) => {
      if (filter.clientKind && provider.clientKind !== filter.clientKind)
        return false;
      if (filter.npm && provider.npm !== filter.npm)
        return false;
      if (filter.kind && provider.kind !== filter.kind)
        return false;
      return true;
    });
  }
  listModels(filter) {
    const models = Object.values(this.data.models);
    if (!filter) {
      return models;
    }
    return models.filter((model) => {
      if (filter.reasoning !== undefined && model.reasoning !== filter.reasoning)
        return false;
      if (filter.tool_call !== undefined && model.tool_call !== filter.tool_call)
        return false;
      if (filter.structured_output !== undefined && model.structured_output !== filter.structured_output)
        return false;
      if (filter.attachment !== undefined && model.attachment !== filter.attachment)
        return false;
      if (filter.open_weights !== undefined && model.open_weights !== filter.open_weights)
        return false;
      if (filter.family && model.family !== filter.family)
        return false;
      if (filter.input && !model.modalities.input.includes(filter.input))
        return false;
      if (filter.output && !model.modalities.output.includes(filter.output))
        return false;
      return true;
    });
  }
  listLabs() {
    return Object.values(this.data.labs);
  }
}
// packages/ai/src/catalogue/generated/providers.generated.ts
var AI_PROVIDERS = {
  "302ai": {
    api: "https://api.302.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://doc.302.ai",
    env: [
      "302AI_API_KEY"
    ],
    id: "302ai",
    kind: "gateway",
    name: "302.AI",
    npm: "@ai-sdk/openai-compatible"
  },
  abacus: {
    api: "https://routellm.abacus.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://abacus.ai/help/api",
    env: [
      "ABACUS_API_KEY"
    ],
    id: "abacus",
    kind: "gateway",
    name: "Abacus",
    npm: "@ai-sdk/openai-compatible"
  },
  "abliteration-ai": {
    api: "https://api.abliteration.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.abliteration.ai/models",
    env: [
      "ABLIT_KEY"
    ],
    id: "abliteration-ai",
    kind: "gateway",
    name: "abliteration.ai",
    npm: "@ai-sdk/openai-compatible"
  },
  aihubmix: {
    clientKind: "custom",
    doc: "https://docs.aihubmix.com",
    env: [
      "AIHUBMIX_API_KEY"
    ],
    id: "aihubmix",
    kind: "custom",
    name: "AIHubMix",
    npm: "@aihubmix/ai-sdk-provider"
  },
  alibaba: {
    api: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    clientKind: "openai-compatible",
    doc: "https://www.alibabacloud.com/help/en/model-studio/models",
    env: [
      "DASHSCOPE_API_KEY"
    ],
    id: "alibaba",
    kind: "gateway",
    name: "Alibaba",
    npm: "@ai-sdk/openai-compatible"
  },
  "alibaba-cn": {
    api: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    clientKind: "openai-compatible",
    doc: "https://www.alibabacloud.com/help/en/model-studio/models",
    env: [
      "DASHSCOPE_API_KEY"
    ],
    id: "alibaba-cn",
    kind: "gateway",
    name: "Alibaba (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "alibaba-coding-plan": {
    api: "https://coding-intl.dashscope.aliyuncs.com/v1",
    clientKind: "openai-compatible",
    doc: "https://www.alibabacloud.com/help/en/model-studio/coding-plan",
    env: [
      "ALIBABA_CODING_PLAN_API_KEY"
    ],
    id: "alibaba-coding-plan",
    kind: "gateway",
    name: "Alibaba Coding Plan",
    npm: "@ai-sdk/openai-compatible"
  },
  "alibaba-coding-plan-cn": {
    api: "https://coding.dashscope.aliyuncs.com/v1",
    clientKind: "openai-compatible",
    doc: "https://help.aliyun.com/zh/model-studio/coding-plan",
    env: [
      "ALIBABA_CODING_PLAN_API_KEY"
    ],
    id: "alibaba-coding-plan-cn",
    kind: "gateway",
    name: "Alibaba Coding Plan (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "alibaba-token-plan": {
    api: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    clientKind: "openai-compatible",
    doc: "https://www.alibabacloud.com/help/en/model-studio/token-plan-overview",
    env: [
      "ALIBABA_TOKEN_PLAN_API_KEY"
    ],
    id: "alibaba-token-plan",
    kind: "gateway",
    name: "Alibaba Token Plan",
    npm: "@ai-sdk/openai-compatible"
  },
  "alibaba-token-plan-cn": {
    api: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    clientKind: "openai-compatible",
    doc: "https://www.alibabacloud.com/help/zh/model-studio/token-plan-overview",
    env: [
      "ALIBABA_TOKEN_PLAN_API_KEY"
    ],
    id: "alibaba-token-plan-cn",
    kind: "gateway",
    name: "Alibaba Token Plan (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "amazon-bedrock": {
    clientKind: "amazon-bedrock",
    doc: "https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html",
    env: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "AWS_BEARER_TOKEN_BEDROCK"
    ],
    id: "amazon-bedrock",
    kind: "cloud",
    name: "Amazon Bedrock",
    npm: "@ai-sdk/amazon-bedrock"
  },
  ambient: {
    api: "https://api.ambient.xyz/v1",
    clientKind: "openai-compatible",
    doc: "https://ambient.xyz",
    env: [
      "AMBIENT_API_KEY"
    ],
    id: "ambient",
    kind: "gateway",
    name: "Ambient",
    npm: "@ai-sdk/openai-compatible"
  },
  anthropic: {
    clientKind: "anthropic",
    doc: "https://docs.anthropic.com/en/docs/about-claude/models",
    env: [
      "ANTHROPIC_API_KEY"
    ],
    id: "anthropic",
    kind: "first-party",
    name: "Anthropic",
    npm: "@ai-sdk/anthropic"
  },
  anyapi: {
    api: "https://api.anyapi.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.anyapi.ai",
    env: [
      "ANYAPI_API_KEY"
    ],
    id: "anyapi",
    kind: "gateway",
    name: "AnyAPI",
    npm: "@ai-sdk/openai-compatible"
  },
  "atomic-chat": {
    api: "http://127.0.0.1:1337/v1",
    clientKind: "openai-compatible",
    doc: "https://atomic.chat",
    env: [
      "ATOMIC_CHAT_API_KEY"
    ],
    id: "atomic-chat",
    kind: "gateway",
    name: "Atomic Chat",
    npm: "@ai-sdk/openai-compatible"
  },
  auriko: {
    api: "https://api.auriko.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.auriko.ai",
    env: [
      "AURIKO_API_KEY"
    ],
    id: "auriko",
    kind: "gateway",
    name: "Auriko",
    npm: "@ai-sdk/openai-compatible"
  },
  azure: {
    clientKind: "custom",
    doc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models",
    env: [
      "AZURE_RESOURCE_NAME",
      "AZURE_API_KEY"
    ],
    id: "azure",
    kind: "custom",
    name: "Azure",
    npm: "@ai-sdk/azure"
  },
  "azure-cognitive-services": {
    clientKind: "custom",
    doc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models",
    env: [
      "AZURE_COGNITIVE_SERVICES_RESOURCE_NAME",
      "AZURE_COGNITIVE_SERVICES_API_KEY"
    ],
    id: "azure-cognitive-services",
    kind: "custom",
    name: "Azure Cognitive Services",
    npm: "@ai-sdk/azure"
  },
  bailing: {
    api: "https://api.tbox.cn/api/llm/v1/chat/completions",
    clientKind: "openai-compatible",
    doc: "https://alipaytbox.yuque.com/sxs0ba/ling/intro",
    env: [
      "BAILING_API_TOKEN"
    ],
    id: "bailing",
    kind: "gateway",
    name: "Bailing",
    npm: "@ai-sdk/openai-compatible"
  },
  baseten: {
    api: "https://inference.baseten.co/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.baseten.co/inference/model-apis/overview",
    env: [
      "BASETEN_API_KEY"
    ],
    id: "baseten",
    kind: "gateway",
    name: "Baseten",
    npm: "@ai-sdk/openai-compatible"
  },
  berget: {
    api: "https://api.berget.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://api.berget.ai",
    env: [
      "BERGET_API_KEY"
    ],
    id: "berget",
    kind: "gateway",
    name: "Berget.AI",
    npm: "@ai-sdk/openai-compatible"
  },
  cerebras: {
    clientKind: "custom",
    doc: "https://inference-docs.cerebras.ai/models/overview",
    env: [
      "CEREBRAS_API_KEY"
    ],
    id: "cerebras",
    kind: "custom",
    name: "Cerebras",
    npm: "@ai-sdk/cerebras"
  },
  chutes: {
    api: "https://llm.chutes.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://llm.chutes.ai/v1/models",
    env: [
      "CHUTES_API_KEY"
    ],
    id: "chutes",
    kind: "gateway",
    name: "Chutes",
    npm: "@ai-sdk/openai-compatible"
  },
  clarifai: {
    api: "https://api.clarifai.com/v2/ext/openai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.clarifai.com/compute/inference/",
    env: [
      "CLARIFAI_PAT"
    ],
    id: "clarifai",
    kind: "gateway",
    name: "Clarifai",
    npm: "@ai-sdk/openai-compatible"
  },
  claudinio: {
    api: "https://api.claudin.io/v1",
    clientKind: "openai-compatible",
    doc: "https://claudin.io",
    env: [
      "CLAUDINIO_API_KEY"
    ],
    id: "claudinio",
    kind: "gateway",
    name: "Claudinio",
    npm: "@ai-sdk/openai-compatible"
  },
  "cloudferro-sherlock": {
    api: "https://api-sherlock.cloudferro.com/openai/v1/",
    clientKind: "openai-compatible",
    doc: "https://docs.sherlock.cloudferro.com/",
    env: [
      "CLOUDFERRO_SHERLOCK_API_KEY"
    ],
    id: "cloudferro-sherlock",
    kind: "gateway",
    name: "CloudFerro Sherlock",
    npm: "@ai-sdk/openai-compatible"
  },
  "cloudflare-ai-gateway": {
    clientKind: "custom",
    doc: "https://developers.cloudflare.com/ai-gateway/",
    env: [
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_GATEWAY_ID"
    ],
    id: "cloudflare-ai-gateway",
    kind: "custom",
    name: "Cloudflare AI Gateway",
    npm: "ai-gateway-provider"
  },
  "cloudflare-workers-ai": {
    api: "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1",
    clientKind: "openai-compatible",
    doc: "https://developers.cloudflare.com/workers-ai/models/",
    env: [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_KEY"
    ],
    id: "cloudflare-workers-ai",
    kind: "gateway",
    name: "Cloudflare Workers AI",
    npm: "@ai-sdk/openai-compatible"
  },
  cohere: {
    clientKind: "custom",
    doc: "https://docs.cohere.com/docs/models",
    env: [
      "COHERE_API_KEY"
    ],
    id: "cohere",
    kind: "custom",
    name: "Cohere",
    npm: "@ai-sdk/cohere"
  },
  cortecs: {
    api: "https://api.cortecs.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://api.cortecs.ai/v1/models",
    env: [
      "CORTECS_API_KEY"
    ],
    id: "cortecs",
    kind: "gateway",
    name: "Cortecs",
    npm: "@ai-sdk/openai-compatible"
  },
  crof: {
    api: "https://crof.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://crof.ai/docs",
    env: [
      "CROF_API_KEY"
    ],
    id: "crof",
    kind: "gateway",
    name: "CrofAI",
    npm: "@ai-sdk/openai-compatible"
  },
  databricks: {
    api: "https://${DATABRICKS_HOST}/ai-gateway/mlflow/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.databricks.com/aws/en/machine-learning/foundation-models/",
    env: [
      "DATABRICKS_HOST",
      "DATABRICKS_TOKEN"
    ],
    id: "databricks",
    kind: "gateway",
    name: "Databricks",
    npm: "@ai-sdk/openai-compatible"
  },
  deepinfra: {
    clientKind: "custom",
    doc: "https://deepinfra.com/models",
    env: [
      "DEEPINFRA_API_KEY"
    ],
    id: "deepinfra",
    kind: "custom",
    name: "Deep Infra",
    npm: "@ai-sdk/deepinfra"
  },
  deepseek: {
    api: "https://api.deepseek.com",
    clientKind: "openai-compatible",
    doc: "https://api-docs.deepseek.com/quick_start/pricing",
    env: [
      "DEEPSEEK_API_KEY"
    ],
    id: "deepseek",
    kind: "gateway",
    name: "DeepSeek",
    npm: "@ai-sdk/openai-compatible"
  },
  digitalocean: {
    api: "https://inference.do-ai.run/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.digitalocean.com/products/gradient-ai-platform/details/models/",
    env: [
      "DIGITALOCEAN_ACCESS_TOKEN"
    ],
    id: "digitalocean",
    kind: "gateway",
    name: "DigitalOcean",
    npm: "@ai-sdk/openai-compatible"
  },
  dinference: {
    api: "https://api.dinference.com/v1",
    clientKind: "openai-compatible",
    doc: "https://dinference.com",
    env: [
      "DINFERENCE_API_KEY"
    ],
    id: "dinference",
    kind: "gateway",
    name: "DInference",
    npm: "@ai-sdk/openai-compatible"
  },
  drun: {
    api: "https://chat.d.run/v1",
    clientKind: "openai-compatible",
    doc: "https://www.d.run",
    env: [
      "DRUN_API_KEY"
    ],
    id: "drun",
    kind: "gateway",
    name: "D.Run (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  evroc: {
    api: "https://models.think.evroc.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.evroc.com/products/think/overview.html",
    env: [
      "EVROC_API_KEY"
    ],
    id: "evroc",
    kind: "gateway",
    name: "evroc",
    npm: "@ai-sdk/openai-compatible"
  },
  fastrouter: {
    api: "https://go.fastrouter.ai/api/v1",
    clientKind: "openai-compatible",
    doc: "https://fastrouter.ai/models",
    env: [
      "FASTROUTER_API_KEY"
    ],
    id: "fastrouter",
    kind: "gateway",
    name: "FastRouter",
    npm: "@ai-sdk/openai-compatible"
  },
  "fireworks-ai": {
    api: "https://api.fireworks.ai/inference/v1/",
    clientKind: "openai-compatible",
    doc: "https://fireworks.ai/docs/",
    env: [
      "FIREWORKS_API_KEY"
    ],
    id: "fireworks-ai",
    kind: "gateway",
    name: "Fireworks AI",
    npm: "@ai-sdk/openai-compatible"
  },
  freemodel: {
    api: "https://cc.freemodel.dev/v1",
    clientKind: "anthropic",
    doc: "https://freemodel.dev",
    env: [
      "FREEMODEL_API_KEY"
    ],
    id: "freemodel",
    kind: "custom",
    name: "FreeModel",
    npm: "@ai-sdk/anthropic"
  },
  friendli: {
    api: "https://api.friendli.ai/serverless/v1",
    clientKind: "openai-compatible",
    doc: "https://friendli.ai/docs/guides/serverless_endpoints/introduction",
    env: [
      "FRIENDLI_TOKEN"
    ],
    id: "friendli",
    kind: "gateway",
    name: "Friendli",
    npm: "@ai-sdk/openai-compatible"
  },
  frogbot: {
    api: "https://app.frogbot.ai/api/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.frogbot.ai",
    env: [
      "FROGBOT_API_KEY"
    ],
    id: "frogbot",
    kind: "gateway",
    name: "FrogBot",
    npm: "@ai-sdk/openai-compatible"
  },
  "github-copilot": {
    api: "https://api.githubcopilot.com",
    clientKind: "openai-compatible",
    doc: "https://docs.github.com/en/copilot",
    env: [
      "GITHUB_TOKEN"
    ],
    id: "github-copilot",
    kind: "gateway",
    name: "GitHub Copilot",
    npm: "@ai-sdk/openai-compatible"
  },
  "github-models": {
    api: "https://models.github.ai/inference",
    clientKind: "openai-compatible",
    doc: "https://docs.github.com/en/github-models",
    env: [
      "GITHUB_TOKEN"
    ],
    id: "github-models",
    kind: "gateway",
    name: "GitHub Models",
    npm: "@ai-sdk/openai-compatible"
  },
  gitlab: {
    clientKind: "custom",
    doc: "https://docs.gitlab.com/user/duo_agent_platform/",
    env: [
      "GITLAB_TOKEN"
    ],
    id: "gitlab",
    kind: "custom",
    name: "GitLab Duo",
    npm: "gitlab-ai-provider"
  },
  gmicloud: {
    api: "https://api.gmi-serving.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.gmicloud.ai/inference-engine/api-reference/llm-api-reference",
    env: [
      "GMICLOUD_API_KEY"
    ],
    id: "gmicloud",
    kind: "gateway",
    name: "GMI Cloud",
    npm: "@ai-sdk/openai-compatible"
  },
  google: {
    clientKind: "google",
    doc: "https://ai.google.dev/gemini-api/docs/models",
    env: [
      "GOOGLE_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GEMINI_API_KEY"
    ],
    id: "google",
    kind: "first-party",
    name: "Google",
    npm: "@ai-sdk/google"
  },
  "google-vertex": {
    clientKind: "google",
    doc: "https://cloud.google.com/vertex-ai/generative-ai/docs/models",
    env: [
      "GOOGLE_VERTEX_PROJECT",
      "GOOGLE_VERTEX_LOCATION",
      "GOOGLE_APPLICATION_CREDENTIALS"
    ],
    id: "google-vertex",
    kind: "cloud",
    name: "Vertex",
    npm: "@ai-sdk/google-vertex"
  },
  "google-vertex-anthropic": {
    clientKind: "custom",
    doc: "https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/claude",
    env: [
      "GOOGLE_VERTEX_PROJECT",
      "GOOGLE_VERTEX_LOCATION",
      "GOOGLE_APPLICATION_CREDENTIALS"
    ],
    id: "google-vertex-anthropic",
    kind: "custom",
    name: "Vertex (Anthropic)",
    npm: "@ai-sdk/google-vertex/anthropic"
  },
  groq: {
    clientKind: "custom",
    doc: "https://console.groq.com/docs/models",
    env: [
      "GROQ_API_KEY"
    ],
    id: "groq",
    kind: "custom",
    name: "Groq",
    npm: "@ai-sdk/groq"
  },
  helicone: {
    api: "https://ai-gateway.helicone.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://helicone.ai/models",
    env: [
      "HELICONE_API_KEY"
    ],
    id: "helicone",
    kind: "gateway",
    name: "Helicone",
    npm: "@ai-sdk/openai-compatible"
  },
  "hpc-ai": {
    api: "https://api.hpc-ai.com/inference/v1",
    clientKind: "openai-compatible",
    doc: "https://www.hpc-ai.com/doc/docs/quickstart/",
    env: [
      "HPC_AI_API_KEY"
    ],
    id: "hpc-ai",
    kind: "gateway",
    name: "HPC-AI",
    npm: "@ai-sdk/openai-compatible"
  },
  huggingface: {
    api: "https://router.huggingface.co/v1",
    clientKind: "openai-compatible",
    doc: "https://huggingface.co/docs/inference-providers",
    env: [
      "HF_TOKEN"
    ],
    id: "huggingface",
    kind: "gateway",
    name: "Hugging Face",
    npm: "@ai-sdk/openai-compatible"
  },
  iflowcn: {
    api: "https://apis.iflow.cn/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.iflow.cn/en/docs",
    env: [
      "IFLOW_API_KEY"
    ],
    id: "iflowcn",
    kind: "gateway",
    name: "iFlow",
    npm: "@ai-sdk/openai-compatible"
  },
  inception: {
    api: "https://api.inceptionlabs.ai/v1/",
    clientKind: "openai-compatible",
    doc: "https://platform.inceptionlabs.ai/docs",
    env: [
      "INCEPTION_API_KEY"
    ],
    id: "inception",
    kind: "gateway",
    name: "Inception",
    npm: "@ai-sdk/openai-compatible"
  },
  inceptron: {
    api: "https://api.inceptron.io/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.inceptron.io",
    env: [
      "INCEPTRON_API_KEY"
    ],
    id: "inceptron",
    kind: "gateway",
    name: "Inceptron",
    npm: "@ai-sdk/openai-compatible"
  },
  inference: {
    api: "https://inference.net/v1",
    clientKind: "openai-compatible",
    doc: "https://inference.net/models",
    env: [
      "INFERENCE_API_KEY"
    ],
    id: "inference",
    kind: "gateway",
    name: "Inference",
    npm: "@ai-sdk/openai-compatible"
  },
  "io-net": {
    api: "https://api.intelligence.io.solutions/api/v1",
    clientKind: "openai-compatible",
    doc: "https://io.net/docs/guides/intelligence/io-intelligence",
    env: [
      "IOINTELLIGENCE_API_KEY"
    ],
    id: "io-net",
    kind: "gateway",
    name: "IO.NET",
    npm: "@ai-sdk/openai-compatible"
  },
  jiekou: {
    api: "https://api.jiekou.ai/openai",
    clientKind: "openai-compatible",
    doc: "https://docs.jiekou.ai/docs/support/quickstart?utm_source=github_models.dev",
    env: [
      "JIEKOU_API_KEY"
    ],
    id: "jiekou",
    kind: "gateway",
    name: "Jiekou.AI",
    npm: "@ai-sdk/openai-compatible"
  },
  kilo: {
    api: "https://api.kilo.ai/api/gateway",
    clientKind: "openai-compatible",
    doc: "https://kilo.ai",
    env: [
      "KILO_API_KEY"
    ],
    id: "kilo",
    kind: "gateway",
    name: "Kilo Gateway",
    npm: "@ai-sdk/openai-compatible"
  },
  "kimi-for-coding": {
    api: "https://api.kimi.com/coding/v1",
    clientKind: "anthropic",
    doc: "https://www.kimi.com/code/docs/en/third-party-tools/other-coding-agents.html",
    env: [
      "KIMI_API_KEY"
    ],
    id: "kimi-for-coding",
    kind: "custom",
    name: "Kimi For Coding",
    npm: "@ai-sdk/anthropic"
  },
  "kuae-cloud-coding-plan": {
    api: "https://coding-plan-endpoint.kuaecloud.net/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.mthreads.com/kuaecloud/kuaecloud-doc-online/coding_plan/",
    env: [
      "KUAE_API_KEY"
    ],
    id: "kuae-cloud-coding-plan",
    kind: "gateway",
    name: "KUAE Cloud Coding Plan",
    npm: "@ai-sdk/openai-compatible"
  },
  lilac: {
    api: "https://api.getlilac.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.getlilac.com/inference/models",
    env: [
      "LILAC_API_KEY"
    ],
    id: "lilac",
    kind: "gateway",
    name: "Lilac",
    npm: "@ai-sdk/openai-compatible"
  },
  llama: {
    api: "https://api.llama.com/compat/v1/",
    clientKind: "openai-compatible",
    doc: "https://llama.developer.meta.com/docs/models",
    env: [
      "LLAMA_API_KEY"
    ],
    id: "llama",
    kind: "gateway",
    name: "Llama",
    npm: "@ai-sdk/openai-compatible"
  },
  llmgateway: {
    api: "https://api.llmgateway.io/v1",
    clientKind: "openai-compatible",
    doc: "https://llmgateway.io/docs",
    env: [
      "LLMGATEWAY_API_KEY"
    ],
    id: "llmgateway",
    kind: "gateway",
    name: "LLM Gateway",
    npm: "@ai-sdk/openai-compatible"
  },
  llmtr: {
    api: "https://llmtr.com/v1",
    clientKind: "openai-compatible",
    doc: "https://llmtr.com/docs",
    env: [
      "LLMTR_API_KEY"
    ],
    id: "llmtr",
    kind: "gateway",
    name: "LLMTR",
    npm: "@ai-sdk/openai-compatible"
  },
  lmstudio: {
    api: "http://127.0.0.1:1234/v1",
    clientKind: "openai-compatible",
    doc: "https://lmstudio.ai/models",
    env: [
      "LMSTUDIO_API_KEY"
    ],
    id: "lmstudio",
    kind: "gateway",
    name: "LMStudio",
    npm: "@ai-sdk/openai-compatible"
  },
  lucidquery: {
    api: "https://api.lucidquery.com/v1",
    clientKind: "openai-compatible",
    doc: "https://lucidquery.com/docs",
    env: [
      "LUCIDQUERY_API_KEY"
    ],
    id: "lucidquery",
    kind: "gateway",
    name: "LucidQuery",
    npm: "@ai-sdk/openai-compatible"
  },
  meganova: {
    api: "https://api.meganova.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.meganova.ai",
    env: [
      "MEGANOVA_API_KEY"
    ],
    id: "meganova",
    kind: "gateway",
    name: "Meganova",
    npm: "@ai-sdk/openai-compatible"
  },
  "merge-gateway": {
    clientKind: "custom",
    doc: "https://docs.merge.dev/merge-gateway",
    env: [
      "MERGE_GATEWAY_API_KEY"
    ],
    id: "merge-gateway",
    kind: "custom",
    name: "Merge Gateway",
    npm: "merge-gateway-ai-sdk-provider"
  },
  minimax: {
    api: "https://api.minimax.io/anthropic/v1",
    clientKind: "anthropic",
    doc: "https://platform.minimax.io/docs/guides/quickstart",
    env: [
      "MINIMAX_API_KEY"
    ],
    id: "minimax",
    kind: "custom",
    name: "MiniMax (minimax.io)",
    npm: "@ai-sdk/anthropic"
  },
  "minimax-cn": {
    api: "https://api.minimaxi.com/anthropic/v1",
    clientKind: "anthropic",
    doc: "https://platform.minimaxi.com/docs/guides/quickstart",
    env: [
      "MINIMAX_API_KEY"
    ],
    id: "minimax-cn",
    kind: "custom",
    name: "MiniMax (minimaxi.com)",
    npm: "@ai-sdk/anthropic"
  },
  "minimax-cn-coding-plan": {
    api: "https://api.minimaxi.com/anthropic/v1",
    clientKind: "anthropic",
    doc: "https://platform.minimaxi.com/docs/token-plan/intro",
    env: [
      "MINIMAX_API_KEY"
    ],
    id: "minimax-cn-coding-plan",
    kind: "custom",
    name: "MiniMax Token Plan (minimaxi.com)",
    npm: "@ai-sdk/anthropic"
  },
  "minimax-coding-plan": {
    api: "https://api.minimax.io/anthropic/v1",
    clientKind: "anthropic",
    doc: "https://platform.minimax.io/docs/token-plan/intro",
    env: [
      "MINIMAX_API_KEY"
    ],
    id: "minimax-coding-plan",
    kind: "custom",
    name: "MiniMax Token Plan (minimax.io)",
    npm: "@ai-sdk/anthropic"
  },
  mistral: {
    clientKind: "custom",
    doc: "https://docs.mistral.ai/getting-started/models/",
    env: [
      "MISTRAL_API_KEY"
    ],
    id: "mistral",
    kind: "first-party",
    name: "Mistral",
    npm: "@ai-sdk/mistral"
  },
  mixlayer: {
    api: "https://models.mixlayer.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.mixlayer.com",
    env: [
      "MIXLAYER_API_KEY"
    ],
    id: "mixlayer",
    kind: "gateway",
    name: "Mixlayer",
    npm: "@ai-sdk/openai-compatible"
  },
  moark: {
    api: "https://moark.com/v1",
    clientKind: "openai-compatible",
    doc: "https://moark.com/docs/openapi/v1#tag/%E6%96%87%E6%9C%AC%E7%94%9F%E6%88%90",
    env: [
      "MOARK_API_KEY"
    ],
    id: "moark",
    kind: "gateway",
    name: "Moark",
    npm: "@ai-sdk/openai-compatible"
  },
  modelscope: {
    api: "https://api-inference.modelscope.cn/v1",
    clientKind: "openai-compatible",
    doc: "https://modelscope.cn/docs/model-service/API-Inference/intro",
    env: [
      "MODELSCOPE_API_KEY"
    ],
    id: "modelscope",
    kind: "gateway",
    name: "ModelScope",
    npm: "@ai-sdk/openai-compatible"
  },
  moonshotai: {
    api: "https://api.moonshot.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.moonshot.ai/docs/api/chat",
    env: [
      "MOONSHOT_API_KEY"
    ],
    id: "moonshotai",
    kind: "gateway",
    name: "Moonshot AI",
    npm: "@ai-sdk/openai-compatible"
  },
  "moonshotai-cn": {
    api: "https://api.moonshot.cn/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.moonshot.cn/docs/api/chat",
    env: [
      "MOONSHOT_API_KEY"
    ],
    id: "moonshotai-cn",
    kind: "gateway",
    name: "Moonshot AI (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  morph: {
    api: "https://api.morphllm.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.morphllm.com/api-reference/introduction",
    env: [
      "MORPH_API_KEY"
    ],
    id: "morph",
    kind: "gateway",
    name: "Morph",
    npm: "@ai-sdk/openai-compatible"
  },
  "nano-gpt": {
    api: "https://nano-gpt.com/api/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.nano-gpt.com",
    env: [
      "NANO_GPT_API_KEY"
    ],
    id: "nano-gpt",
    kind: "gateway",
    name: "NanoGPT",
    npm: "@ai-sdk/openai-compatible"
  },
  nearai: {
    api: "https://cloud-api.near.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.near.ai/",
    env: [
      "NEARAI_API_KEY"
    ],
    id: "nearai",
    kind: "gateway",
    name: "NEAR AI Cloud",
    npm: "@ai-sdk/openai-compatible"
  },
  nebius: {
    api: "https://api.tokenfactory.nebius.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.tokenfactory.nebius.com/",
    env: [
      "NEBIUS_API_KEY"
    ],
    id: "nebius",
    kind: "gateway",
    name: "Nebius Token Factory",
    npm: "@ai-sdk/openai-compatible"
  },
  neon: {
    api: "${NEON_AI_GATEWAY_BASE_URL}/ai-gateway/mlflow/v1",
    clientKind: "openai-compatible",
    doc: "https://neon.com/docs",
    env: [
      "NEON_AI_GATEWAY_BASE_URL",
      "NEON_AI_GATEWAY_TOKEN"
    ],
    id: "neon",
    kind: "gateway",
    name: "Neon",
    npm: "@ai-sdk/openai-compatible"
  },
  neuralwatt: {
    api: "https://api.neuralwatt.com/v1",
    clientKind: "openai-compatible",
    doc: "https://portal.neuralwatt.com/docs",
    env: [
      "NEURALWATT_API_KEY"
    ],
    id: "neuralwatt",
    kind: "gateway",
    name: "Neuralwatt",
    npm: "@ai-sdk/openai-compatible"
  },
  nova: {
    api: "https://api.nova.amazon.com/v1",
    clientKind: "openai-compatible",
    doc: "https://nova.amazon.com/dev/documentation",
    env: [
      "NOVA_API_KEY"
    ],
    id: "nova",
    kind: "gateway",
    name: "Nova",
    npm: "@ai-sdk/openai-compatible"
  },
  "novita-ai": {
    api: "https://api.novita.ai/openai",
    clientKind: "openai-compatible",
    doc: "https://novita.ai/docs/guides/introduction",
    env: [
      "NOVITA_API_KEY"
    ],
    id: "novita-ai",
    kind: "gateway",
    name: "NovitaAI",
    npm: "@ai-sdk/openai-compatible"
  },
  nvidia: {
    api: "https://integrate.api.nvidia.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.api.nvidia.com/nim/",
    env: [
      "NVIDIA_API_KEY"
    ],
    id: "nvidia",
    kind: "gateway",
    name: "Nvidia",
    npm: "@ai-sdk/openai-compatible"
  },
  "ollama-cloud": {
    api: "https://ollama.com/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.ollama.com/cloud",
    env: [
      "OLLAMA_API_KEY"
    ],
    id: "ollama-cloud",
    kind: "gateway",
    name: "Ollama Cloud",
    npm: "@ai-sdk/openai-compatible"
  },
  openai: {
    clientKind: "openai",
    doc: "https://platform.openai.com/docs/models",
    env: [
      "OPENAI_API_KEY"
    ],
    id: "openai",
    kind: "first-party",
    name: "OpenAI",
    npm: "@ai-sdk/openai"
  },
  opencode: {
    api: "https://opencode.ai/zen/v1",
    clientKind: "openai-compatible",
    doc: "https://opencode.ai/docs/zen",
    env: [
      "OPENCODE_API_KEY"
    ],
    id: "opencode",
    kind: "gateway",
    name: "OpenCode Zen",
    npm: "@ai-sdk/openai-compatible"
  },
  "opencode-go": {
    api: "https://opencode.ai/zen/go/v1",
    clientKind: "openai-compatible",
    doc: "https://opencode.ai/docs/zen",
    env: [
      "OPENCODE_API_KEY"
    ],
    id: "opencode-go",
    kind: "gateway",
    name: "OpenCode Go",
    npm: "@ai-sdk/openai-compatible"
  },
  openrouter: {
    api: "https://openrouter.ai/api/v1",
    clientKind: "custom",
    doc: "https://openrouter.ai/models",
    env: [
      "OPENROUTER_API_KEY"
    ],
    id: "openrouter",
    kind: "gateway",
    name: "OpenRouter",
    npm: "@openrouter/ai-sdk-provider"
  },
  orcarouter: {
    api: "https://api.orcarouter.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.orcarouter.ai",
    env: [
      "ORCAROUTER_API_KEY"
    ],
    id: "orcarouter",
    kind: "gateway",
    name: "OrcaRouter",
    npm: "@ai-sdk/openai-compatible"
  },
  ovhcloud: {
    api: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    clientKind: "openai-compatible",
    doc: "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog//",
    env: [
      "OVHCLOUD_API_KEY"
    ],
    id: "ovhcloud",
    kind: "gateway",
    name: "OVHcloud AI Endpoints",
    npm: "@ai-sdk/openai-compatible"
  },
  perplexity: {
    clientKind: "custom",
    doc: "https://docs.perplexity.ai",
    env: [
      "PERPLEXITY_API_KEY"
    ],
    id: "perplexity",
    kind: "custom",
    name: "Perplexity",
    npm: "@ai-sdk/perplexity"
  },
  "perplexity-agent": {
    api: "https://api.perplexity.ai/v1",
    clientKind: "openai",
    doc: "https://docs.perplexity.ai/docs/agent-api/models",
    env: [
      "PERPLEXITY_API_KEY"
    ],
    id: "perplexity-agent",
    kind: "custom",
    name: "Perplexity Agent",
    npm: "@ai-sdk/openai"
  },
  poe: {
    api: "https://api.poe.com/v1",
    clientKind: "openai-compatible",
    doc: "https://creator.poe.com/docs/external-applications/openai-compatible-api",
    env: [
      "POE_API_KEY"
    ],
    id: "poe",
    kind: "gateway",
    name: "Poe",
    npm: "@ai-sdk/openai-compatible"
  },
  poolside: {
    api: "https://inference.poolside.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.poolside.ai",
    env: [
      "POOLSIDE_API_KEY"
    ],
    id: "poolside",
    kind: "gateway",
    name: "Poolside",
    npm: "@ai-sdk/openai-compatible"
  },
  "privatemode-ai": {
    api: "http://localhost:8080/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.privatemode.ai/api/overview",
    env: [
      "PRIVATEMODE_API_KEY",
      "PRIVATEMODE_ENDPOINT"
    ],
    id: "privatemode-ai",
    kind: "local",
    name: "Privatemode AI",
    npm: "@ai-sdk/openai-compatible"
  },
  "qihang-ai": {
    api: "https://api.qhaigc.net/v1",
    clientKind: "openai-compatible",
    doc: "https://www.qhaigc.net/docs",
    env: [
      "QIHANG_API_KEY"
    ],
    id: "qihang-ai",
    kind: "gateway",
    name: "QiHang",
    npm: "@ai-sdk/openai-compatible"
  },
  "qiniu-ai": {
    api: "https://api.qnaigc.com/v1",
    clientKind: "openai-compatible",
    doc: "https://developer.qiniu.com/aitokenapi",
    env: [
      "QINIU_API_KEY"
    ],
    id: "qiniu-ai",
    kind: "gateway",
    name: "Qiniu",
    npm: "@ai-sdk/openai-compatible"
  },
  "regolo-ai": {
    api: "https://api.regolo.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.regolo.ai/",
    env: [
      "REGOLO_API_KEY"
    ],
    id: "regolo-ai",
    kind: "gateway",
    name: "Regolo AI",
    npm: "@ai-sdk/openai-compatible"
  },
  requesty: {
    api: "https://router.requesty.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://requesty.ai/solution/llm-routing/models",
    env: [
      "REQUESTY_API_KEY"
    ],
    id: "requesty",
    kind: "gateway",
    name: "Requesty",
    npm: "@ai-sdk/openai-compatible"
  },
  "routing-run": {
    api: "https://ai.routing.sh/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.routing.run/api-reference/models",
    env: [
      "ROUTING_RUN_API_KEY"
    ],
    id: "routing-run",
    kind: "gateway",
    name: "routing.run",
    npm: "@ai-sdk/openai-compatible"
  },
  "sap-ai-core": {
    clientKind: "custom",
    doc: "https://help.sap.com/docs/sap-ai-core",
    env: [
      "AICORE_SERVICE_KEY"
    ],
    id: "sap-ai-core",
    kind: "custom",
    name: "SAP AI Core",
    npm: "@jerome-benoit/sap-ai-provider-v2"
  },
  sarvam: {
    api: "https://api.sarvam.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.sarvam.ai/api-reference-docs/getting-started/models",
    env: [
      "SARVAM_API_KEY"
    ],
    id: "sarvam",
    kind: "gateway",
    name: "Sarvam AI",
    npm: "@ai-sdk/openai-compatible"
  },
  scaleway: {
    api: "https://api.scaleway.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://www.scaleway.com/en/docs/generative-apis/",
    env: [
      "SCALEWAY_API_KEY"
    ],
    id: "scaleway",
    kind: "gateway",
    name: "Scaleway",
    npm: "@ai-sdk/openai-compatible"
  },
  siliconflow: {
    api: "https://api.siliconflow.com/v1",
    clientKind: "openai-compatible",
    doc: "https://cloud.siliconflow.com/models",
    env: [
      "SILICONFLOW_API_KEY"
    ],
    id: "siliconflow",
    kind: "gateway",
    name: "SiliconFlow",
    npm: "@ai-sdk/openai-compatible"
  },
  "siliconflow-cn": {
    api: "https://api.siliconflow.cn/v1",
    clientKind: "openai-compatible",
    doc: "https://cloud.siliconflow.com/models",
    env: [
      "SILICONFLOW_CN_API_KEY"
    ],
    id: "siliconflow-cn",
    kind: "gateway",
    name: "SiliconFlow (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "snowflake-cortex": {
    api: "https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-rest-api",
    env: [
      "SNOWFLAKE_ACCOUNT",
      "SNOWFLAKE_CORTEX_PAT"
    ],
    id: "snowflake-cortex",
    kind: "gateway",
    name: "Snowflake Cortex",
    npm: "@ai-sdk/openai-compatible"
  },
  stackit: {
    api: "https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models",
    env: [
      "STACKIT_API_KEY"
    ],
    id: "stackit",
    kind: "gateway",
    name: "STACKIT",
    npm: "@ai-sdk/openai-compatible"
  },
  stepfun: {
    api: "https://api.stepfun.com/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.stepfun.com/docs/zh/overview/concept",
    env: [
      "STEPFUN_API_KEY"
    ],
    id: "stepfun",
    kind: "gateway",
    name: "StepFun",
    npm: "@ai-sdk/openai-compatible"
  },
  "stepfun-ai": {
    api: "https://api.stepfun.ai/step_plan/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.stepfun.ai/docs/en/step-plan/integrations/open-code",
    env: [
      "STEPFUN_API_KEY"
    ],
    id: "stepfun-ai",
    kind: "gateway",
    name: "StepFun AI",
    npm: "@ai-sdk/openai-compatible"
  },
  submodel: {
    api: "https://llm.submodel.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://submodel.gitbook.io",
    env: [
      "SUBMODEL_INSTAGEN_ACCESS_KEY"
    ],
    id: "submodel",
    kind: "gateway",
    name: "submodel",
    npm: "@ai-sdk/openai-compatible"
  },
  synthetic: {
    api: "https://api.synthetic.new/openai/v1",
    clientKind: "openai-compatible",
    doc: "https://synthetic.new/pricing",
    env: [
      "SYNTHETIC_API_KEY"
    ],
    id: "synthetic",
    kind: "gateway",
    name: "Synthetic",
    npm: "@ai-sdk/openai-compatible"
  },
  "tencent-coding-plan": {
    api: "https://api.lkeap.cloud.tencent.com/coding/v3",
    clientKind: "openai-compatible",
    doc: "https://cloud.tencent.com/document/product/1772/128947",
    env: [
      "TENCENT_CODING_PLAN_API_KEY"
    ],
    id: "tencent-coding-plan",
    kind: "gateway",
    name: "Tencent Coding Plan (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "tencent-tokenhub": {
    api: "https://tokenhub.tencentmaas.com/v1",
    clientKind: "openai-compatible",
    doc: "https://cloud.tencent.com/document/product/1823/130050",
    env: [
      "TENCENT_TOKENHUB_API_KEY"
    ],
    id: "tencent-tokenhub",
    kind: "gateway",
    name: "Tencent TokenHub",
    npm: "@ai-sdk/openai-compatible"
  },
  "the-grid-ai": {
    api: "https://api.thegrid.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://thegrid.ai/docs",
    env: [
      "THEGRIDAI_API_KEY"
    ],
    id: "the-grid-ai",
    kind: "gateway",
    name: "The Grid AI",
    npm: "@ai-sdk/openai-compatible"
  },
  tinfoil: {
    api: "https://inference.tinfoil.sh/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.tinfoil.sh",
    env: [
      "TINFOIL_API_KEY"
    ],
    id: "tinfoil",
    kind: "gateway",
    name: "Tinfoil",
    npm: "@ai-sdk/openai-compatible"
  },
  togetherai: {
    clientKind: "custom",
    doc: "https://docs.together.ai/docs/serverless-models",
    env: [
      "TOGETHER_API_KEY"
    ],
    id: "togetherai",
    kind: "custom",
    name: "Together AI",
    npm: "@ai-sdk/togetherai"
  },
  "umans-ai": {
    api: "https://api.code.umans.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://app.umans.ai/offers/code/docs/orgs",
    env: [
      "UMANS_AI_API_KEY"
    ],
    id: "umans-ai",
    kind: "gateway",
    name: "Umans AI",
    npm: "@ai-sdk/openai-compatible"
  },
  "umans-ai-coding-plan": {
    api: "https://api.code.umans.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://app.umans.ai/offers/code/docs",
    env: [
      "UMANS_AI_CODING_PLAN_API_KEY"
    ],
    id: "umans-ai-coding-plan",
    kind: "gateway",
    name: "Umans AI Coding Plan",
    npm: "@ai-sdk/openai-compatible"
  },
  upstage: {
    api: "https://api.upstage.ai/v1/solar",
    clientKind: "openai-compatible",
    doc: "https://developers.upstage.ai/docs/apis/chat",
    env: [
      "UPSTAGE_API_KEY"
    ],
    id: "upstage",
    kind: "gateway",
    name: "Upstage",
    npm: "@ai-sdk/openai-compatible"
  },
  v0: {
    clientKind: "custom",
    doc: "https://sdk.vercel.ai/providers/ai-sdk-providers/vercel",
    env: [
      "V0_API_KEY"
    ],
    id: "v0",
    kind: "custom",
    name: "v0",
    npm: "@ai-sdk/vercel"
  },
  venice: {
    clientKind: "custom",
    doc: "https://docs.venice.ai",
    env: [
      "VENICE_API_KEY"
    ],
    id: "venice",
    kind: "custom",
    name: "Venice AI",
    npm: "venice-ai-sdk-provider"
  },
  vercel: {
    clientKind: "custom",
    doc: "https://github.com/vercel/ai/tree/5eb85cc45a259553501f535b8ac79a77d0e79223/packages/gateway",
    env: [
      "AI_GATEWAY_API_KEY"
    ],
    id: "vercel",
    kind: "custom",
    name: "Vercel AI Gateway",
    npm: "@ai-sdk/gateway"
  },
  vivgrid: {
    api: "https://api.vivgrid.com/v1",
    clientKind: "openai",
    doc: "https://docs.vivgrid.com/models",
    env: [
      "VIVGRID_API_KEY"
    ],
    id: "vivgrid",
    kind: "custom",
    name: "Vivgrid",
    npm: "@ai-sdk/openai"
  },
  vultr: {
    api: "https://api.vultrinference.com/v1",
    clientKind: "openai-compatible",
    doc: "https://api.vultrinference.com/",
    env: [
      "VULTR_API_KEY"
    ],
    id: "vultr",
    kind: "gateway",
    name: "Vultr",
    npm: "@ai-sdk/openai-compatible"
  },
  "wafer.ai": {
    api: "https://pass.wafer.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.wafer.ai/wafer-pass",
    env: [
      "WAFER_API_KEY"
    ],
    id: "wafer.ai",
    kind: "gateway",
    name: "Wafer",
    npm: "@ai-sdk/openai-compatible"
  },
  wandb: {
    api: "https://api.inference.wandb.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.wandb.ai/guides/integrations/inference/",
    env: [
      "WANDB_API_KEY"
    ],
    id: "wandb",
    kind: "gateway",
    name: "Weights & Biases",
    npm: "@ai-sdk/openai-compatible"
  },
  xai: {
    clientKind: "custom",
    doc: "https://docs.x.ai/docs/models",
    env: [
      "XAI_API_KEY"
    ],
    id: "xai",
    kind: "first-party",
    name: "xAI",
    npm: "@ai-sdk/xai"
  },
  xiaomi: {
    api: "https://api.xiaomimimo.com/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.xiaomimimo.com/#/docs",
    env: [
      "XIAOMI_API_KEY"
    ],
    id: "xiaomi",
    kind: "gateway",
    name: "Xiaomi",
    npm: "@ai-sdk/openai-compatible"
  },
  "xiaomi-token-plan-ams": {
    api: "https://token-plan-ams.xiaomimimo.com/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.xiaomimimo.com/#/docs",
    env: [
      "XIAOMI_API_KEY"
    ],
    id: "xiaomi-token-plan-ams",
    kind: "gateway",
    name: "Xiaomi Token Plan (Europe)",
    npm: "@ai-sdk/openai-compatible"
  },
  "xiaomi-token-plan-cn": {
    api: "https://token-plan-cn.xiaomimimo.com/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.xiaomimimo.com/#/docs",
    env: [
      "XIAOMI_API_KEY"
    ],
    id: "xiaomi-token-plan-cn",
    kind: "gateway",
    name: "Xiaomi Token Plan (China)",
    npm: "@ai-sdk/openai-compatible"
  },
  "xiaomi-token-plan-sgp": {
    api: "https://token-plan-sgp.xiaomimimo.com/v1",
    clientKind: "openai-compatible",
    doc: "https://platform.xiaomimimo.com/#/docs",
    env: [
      "XIAOMI_API_KEY"
    ],
    id: "xiaomi-token-plan-sgp",
    kind: "gateway",
    name: "Xiaomi Token Plan (Singapore)",
    npm: "@ai-sdk/openai-compatible"
  },
  xpersona: {
    api: "https://www.xpersona.co/v1",
    clientKind: "openai-compatible",
    doc: "https://www.xpersona.co/docs",
    env: [
      "XPERSONA_API_KEY"
    ],
    id: "xpersona",
    kind: "gateway",
    name: "Xpersona",
    npm: "@ai-sdk/openai-compatible"
  },
  zai: {
    api: "https://api.z.ai/api/paas/v4",
    clientKind: "openai-compatible",
    doc: "https://docs.z.ai/guides/overview/pricing",
    env: [
      "ZHIPU_API_KEY"
    ],
    id: "zai",
    kind: "gateway",
    name: "Z.AI",
    npm: "@ai-sdk/openai-compatible"
  },
  "zai-coding-plan": {
    api: "https://api.z.ai/api/coding/paas/v4",
    clientKind: "openai-compatible",
    doc: "https://docs.z.ai/devpack/overview",
    env: [
      "ZHIPU_API_KEY"
    ],
    id: "zai-coding-plan",
    kind: "gateway",
    name: "Z.AI Coding Plan",
    npm: "@ai-sdk/openai-compatible"
  },
  zeldoc: {
    api: "https://api.zeldoc.ai/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.zeldoc.ai",
    env: [
      "ZELDOC_API_KEY"
    ],
    id: "zeldoc",
    kind: "gateway",
    name: "Zeldoc",
    npm: "@ai-sdk/openai-compatible"
  },
  zenmux: {
    api: "https://zenmux.ai/api/v1",
    clientKind: "openai-compatible",
    doc: "https://docs.zenmux.ai",
    env: [
      "ZENMUX_API_KEY"
    ],
    id: "zenmux",
    kind: "gateway",
    name: "ZenMux",
    npm: "@ai-sdk/openai-compatible"
  },
  zhipuai: {
    api: "https://open.bigmodel.cn/api/paas/v4",
    clientKind: "openai-compatible",
    doc: "https://docs.z.ai/guides/overview/pricing",
    env: [
      "ZHIPU_API_KEY"
    ],
    id: "zhipuai",
    kind: "first-party",
    name: "Zhipu AI",
    npm: "@ai-sdk/openai-compatible"
  },
  "zhipuai-coding-plan": {
    api: "https://open.bigmodel.cn/api/coding/paas/v4",
    clientKind: "openai-compatible",
    doc: "https://docs.bigmodel.cn/cn/coding-plan/overview",
    env: [
      "ZHIPU_API_KEY"
    ],
    id: "zhipuai-coding-plan",
    kind: "gateway",
    name: "Zhipu AI Coding Plan",
    npm: "@ai-sdk/openai-compatible"
  }
};
// packages/ai/src/catalogue/generated/models.generated.ts
var AI_MODELS = {
  "alibaba/qwen-flash": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-flash",
    knowledge: "2024-04",
    last_updated: "2025-07-28",
    limit: {
      context: 1e6,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen Flash",
    open_weights: false,
    reasoning: true,
    release_date: "2025-07-28",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-max": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 21.8,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen-max",
    knowledge: "2024-04",
    last_updated: "2025-01-25",
    limit: {
      context: 32768,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen Max",
    open_weights: false,
    reasoning: false,
    release_date: "2024-04-03",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-omni-turbo": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-omni-turbo",
    knowledge: "2024-04",
    last_updated: "2025-03-26",
    limit: {
      context: 32768,
      output: 2048
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text",
        "audio"
      ]
    },
    name: "Qwen-Omni Turbo",
    open_weights: false,
    reasoning: false,
    release_date: "2025-01-19",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-plus",
    knowledge: "2024-04",
    last_updated: "2025-09-11",
    limit: {
      context: 1e6,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2024-01-25",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-turbo": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-turbo",
    knowledge: "2024-04",
    last_updated: "2025-04-28",
    limit: {
      context: 1e6,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen Turbo",
    open_weights: false,
    reasoning: true,
    release_date: "2024-11-01",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-vl-max": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-vl-max",
    knowledge: "2024-04",
    last_updated: "2025-08-13",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen-VL Max",
    open_weights: false,
    reasoning: false,
    release_date: "2024-04-08",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen-vl-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen-vl-plus",
    knowledge: "2024-04",
    last_updated: "2025-08-15",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen-VL Plus",
    open_weights: false,
    reasoning: false,
    release_date: "2024-01-25",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen2-5-vl-72b-instruct": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen2-5-vl-72b-instruct",
    knowledge: "2024-04",
    last_updated: "2024-09",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen2.5-VL 72B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2024-09",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct"
      }
    ]
  },
  "alibaba/qwen3-235b-a22b": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 59.6,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 21.41,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3-235b-a22b",
    knowledge: "2025-04",
    last_updated: "2025-04",
    limit: {
      context: 131072,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3 235B-A22B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-04",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-235B-A22B"
      }
    ]
  },
  "alibaba/qwen3-32b": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 40,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3-32b",
    knowledge: "2025-04",
    last_updated: "2025-04",
    limit: {
      context: 131072,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3 32B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-04",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-32B"
      }
    ]
  },
  "alibaba/qwen3-coder-30b-a3b-instruct": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 19.4,
        source: "https://openrouter.ai/qwen/qwen3-coder-30b-a3b-instruct/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 27.8,
        source: "https://openrouter.ai/qwen/qwen3-coder-30b-a3b-instruct/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 15.2,
        source: "https://openrouter.ai/qwen/qwen3-coder-30b-a3b-instruct/benchmarks"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3-coder-30b-a3b-instruct",
    knowledge: "2025-04",
    last_updated: "2025-04",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3-Coder 30B-A3B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-04",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct"
      }
    ]
  },
  "alibaba/qwen3-coder-480b-a35b-instruct": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 38.7,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3-coder-480b-a35b-instruct",
    knowledge: "2025-04",
    last_updated: "2025-04",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3-Coder 480B-A35B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-04",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct"
      }
    ]
  },
  "alibaba/qwen3-coder-flash": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3-coder-flash",
    knowledge: "2025-04",
    last_updated: "2025-07-28",
    limit: {
      context: 1e6,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3 Coder Flash",
    open_weights: false,
    reasoning: false,
    release_date: "2025-07-28",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3-coder-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3-coder-plus",
    knowledge: "2025-04",
    last_updated: "2025-07-23",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3 Coder Plus",
    open_weights: false,
    reasoning: false,
    release_date: "2025-07-23",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3-max": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 26.4,
        source: "https://openrouter.ai/qwen/qwen3-max/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 38.3,
        source: "https://openrouter.ai/qwen/qwen3-max/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 20.5,
        source: "https://openrouter.ai/qwen/qwen3-max/benchmarks"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3-max",
    knowledge: "2025-04",
    last_updated: "2025-09-23",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3 Max",
    open_weights: false,
    reasoning: false,
    release_date: "2025-09-23",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3-next-80b-a3b-instruct": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3-next-80b-a3b-instruct",
    knowledge: "2025-04",
    last_updated: "2025-09",
    limit: {
      context: 131072,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3-Next 80B-A3B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-09",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct"
      }
    ]
  },
  "alibaba/qwen3-next-80b-a3b-thinking": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3-next-80b-a3b-thinking",
    knowledge: "2025-04",
    last_updated: "2025-09",
    limit: {
      context: 131072,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3-Next 80B-A3B (Thinking)",
    open_weights: true,
    reasoning: true,
    release_date: "2025-09",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Thinking"
      }
    ]
  },
  "alibaba/qwen3-vl-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3-vl-plus",
    knowledge: "2025-04",
    last_updated: "2025-09-23",
    limit: {
      context: 262144,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3-VL Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-23",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.5-122b-a10b": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 72,
        source: "https://huggingface.co/Qwen/Qwen3.5-122B-A10B"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3.5-122b-a10b",
    last_updated: "2026-02-23",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 122B-A10B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-23",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.5-122B-A10B"
      }
    ]
  },
  "alibaba/qwen3.5-27b": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 72.4,
        source: "https://huggingface.co/Qwen/Qwen3.5-27B"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3.5-27b",
    last_updated: "2026-02-23",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 27B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-23",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.5-27B"
      }
    ]
  },
  "alibaba/qwen3.5-35b-a3b": {
    attachment: true,
    family: "qwen",
    id: "alibaba/qwen3.5-35b-a3b",
    last_updated: "2026-02-23",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 35B-A3B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-23",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.5-35B-A3B"
      }
    ]
  },
  "alibaba/qwen3.5-397b-a17b": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 76.4,
        source: "https://huggingface.co/Qwen/Qwen3.5-397B-A17B"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3.5-397b-a17b",
    last_updated: "2026-02-15",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 397B-A17B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-15",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.5-397B-A17B"
      }
    ]
  },
  "alibaba/qwen3.5-9b": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.5-9b",
    last_updated: "2026-02-23",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 9B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-23",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.5-9B"
      }
    ]
  },
  "alibaba/qwen3.5-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.5-plus",
    knowledge: "2025-04",
    last_updated: "2026-02-16",
    limit: {
      context: 1e6,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.5 Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-16",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.6-27b": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 77.2,
        source: "https://huggingface.co/Qwen/Qwen3.6-27B"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3.6-27b",
    last_updated: "2026-04-22",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.6 27B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-22",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.6-27B"
      }
    ]
  },
  "alibaba/qwen3.6-35b-a3b": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 73.4,
        source: "https://huggingface.co/Qwen/Qwen3.6-35B-A3B"
      }
    ],
    family: "qwen",
    id: "alibaba/qwen3.6-35b-a3b",
    last_updated: "2026-04-17",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.6 35B-A3B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-17",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3.6-35B-A3B"
      }
    ]
  },
  "alibaba/qwen3.6-flash": {
    attachment: true,
    family: "qwen3.6",
    id: "alibaba/qwen3.6-flash",
    last_updated: "2026-04-27",
    limit: {
      context: 1e6,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.6 Flash",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-27",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.6-max-preview": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.6-max-preview",
    knowledge: "2025-04",
    last_updated: "2026-04-20",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.6 Max Preview",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-20",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.6-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.6-plus",
    knowledge: "2025-04",
    last_updated: "2026-04-02",
    limit: {
      context: 1e6,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.6 Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-02",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.7-max": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.7-max",
    last_updated: "2026-05-21",
    limit: {
      context: 1e6,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.7 Max",
    open_weights: false,
    reasoning: true,
    release_date: "2026-05-21",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwen3.7-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwen3.7-plus",
    knowledge: "2025-04",
    last_updated: "2026-06-02",
    limit: {
      context: 1e6,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Qwen3.7 Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2026-06-02",
    temperature: true,
    tool_call: true
  },
  "alibaba/qwq-plus": {
    attachment: false,
    family: "qwen",
    id: "alibaba/qwq-plus",
    knowledge: "2024-04",
    last_updated: "2025-03-05",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "QwQ Plus",
    open_weights: false,
    reasoning: true,
    release_date: "2025-03-05",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-3-5-haiku-20241022": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 28,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-haiku",
    id: "anthropic/claude-3-5-haiku-20241022",
    knowledge: "2024-07-31",
    last_updated: "2024-10-22",
    limit: {
      context: 200000,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Haiku 3.5",
    open_weights: false,
    reasoning: false,
    release_date: "2024-10-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-3-5-sonnet-20241022": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 51.6,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-3-5-sonnet-20241022",
    knowledge: "2024-04-30",
    last_updated: "2024-10-22",
    limit: {
      context: 200000,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 3.5 v2",
    open_weights: false,
    reasoning: false,
    release_date: "2024-10-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-3-7-sonnet-20250219": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 64.9,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-3-7-sonnet-20250219",
    knowledge: "2024-10-31",
    last_updated: "2025-02-19",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 3.7",
    open_weights: false,
    reasoning: true,
    release_date: "2025-02-19",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-fable-5": {
    attachment: true,
    family: "claude-fable",
    id: "anthropic/claude-fable-5",
    knowledge: "2026-01-31",
    last_updated: "2026-06-09",
    limit: {
      context: 1e6,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Fable 5",
    open_weights: false,
    reasoning: true,
    release_date: "2026-06-09",
    temperature: false,
    tool_call: true
  },
  "anthropic/claude-haiku-4-5": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 39.45,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "claude-haiku",
    id: "anthropic/claude-haiku-4-5",
    knowledge: "2025-02-28",
    last_updated: "2025-10-15",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Haiku 4.5 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-10-15",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-haiku-4-5-20251001": {
    attachment: true,
    family: "claude-haiku",
    id: "anthropic/claude-haiku-4-5-20251001",
    knowledge: "2025-02-28",
    last_updated: "2025-10-15",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Haiku 4.5",
    open_weights: false,
    reasoning: true,
    release_date: "2025-10-15",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-0": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 72,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-0",
    knowledge: "2025-03-31",
    last_updated: "2025-05-22",
    limit: {
      context: 200000,
      output: 32000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-05-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-1": {
    attachment: true,
    family: "claude-opus",
    id: "anthropic/claude-opus-4-1",
    knowledge: "2025-03-31",
    last_updated: "2025-08-05",
    limit: {
      context: 200000,
      output: 32000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.1 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-05",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-1-20250805": {
    attachment: true,
    family: "claude-opus",
    id: "anthropic/claude-opus-4-1-20250805",
    knowledge: "2025-03-31",
    last_updated: "2025-08-05",
    limit: {
      context: 200000,
      output: 32000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.1",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-05",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-20250514": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 72,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-20250514",
    knowledge: "2025-03-31",
    last_updated: "2025-05-22",
    limit: {
      context: 200000,
      output: 32000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4",
    open_weights: false,
    reasoning: true,
    release_date: "2025-05-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-5": {
    attachment: true,
    family: "claude-opus",
    id: "anthropic/claude-opus-4-5",
    knowledge: "2025-03-31",
    last_updated: "2025-11-24",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.5 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-24",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-5-20251101": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 45.89,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-5-20251101",
    knowledge: "2025-03-31",
    last_updated: "2025-11-01",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.5",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-01",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-6": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 51.9,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 33.3,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 30,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 35.58,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 36.67,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 36.08,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 51.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 71.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 11.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 70.2,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-6",
    knowledge: "2025-05-31",
    last_updated: "2026-03-13",
    limit: {
      context: 1e6,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.6",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-05",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-opus-4-7": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 64.3,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench",
        score: 66.1,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 48.57,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 66.6,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 81,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 44.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 73.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 61.2,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 78.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 34.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 70.6,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 59.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 71.7,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 36.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 71.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-7",
    knowledge: "2026-01-31",
    last_updated: "2026-04-16",
    limit: {
      context: 1e6,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.7",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-16",
    temperature: false,
    tool_call: true
  },
  "anthropic/claude-opus-4-8": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 69.2,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench",
        score: 74.6,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      }
    ],
    family: "claude-opus",
    id: "anthropic/claude-opus-4-8",
    last_updated: "2026-05-28",
    limit: {
      context: 1e6,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Opus 4.8",
    open_weights: false,
    reasoning: true,
    release_date: "2026-05-28",
    temperature: false,
    tool_call: true
  },
  "anthropic/claude-sonnet-4-0": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 61.3,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 42.7,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-sonnet-4-0",
    knowledge: "2025-03-31",
    last_updated: "2025-05-22",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 4 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-05-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-sonnet-4-20250514": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 61.3,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-sonnet-4-20250514",
    knowledge: "2025-03-31",
    last_updated: "2025-05-22",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 4",
    open_weights: false,
    reasoning: true,
    release_date: "2025-05-22",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-sonnet-4-5": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 43.6,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-sonnet-4-5",
    knowledge: "2025-07-31",
    last_updated: "2025-09-29",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 4.5 (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-29",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-sonnet-4-5-20250929": {
    attachment: true,
    family: "claude-sonnet",
    id: "anthropic/claude-sonnet-4-5-20250929",
    knowledge: "2025-07-31",
    last_updated: "2025-09-29",
    limit: {
      context: 200000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 4.5",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-29",
    temperature: true,
    tool_call: true
  },
  "anthropic/claude-sonnet-4-6": {
    attachment: true,
    benchmarks: [
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 31.2,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 32.21,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 31.76,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 49.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 70.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 14.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 63.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "claude-sonnet",
    id: "anthropic/claude-sonnet-4-6",
    knowledge: "2025-08-31",
    last_updated: "2026-03-13",
    limit: {
      context: 1e6,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Claude Sonnet 4.6",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-17",
    temperature: true,
    tool_call: true
  },
  "cohere/command-a-03-2025": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 12,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "command-a",
    id: "cohere/command-a-03-2025",
    knowledge: "2024-06-01",
    last_updated: "2025-03-13",
    limit: {
      context: 256000,
      output: 8000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Command A",
    open_weights: true,
    reasoning: false,
    release_date: "2025-03-13",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/CohereLabs/c4ai-command-a-03-2025"
      }
    ]
  },
  "cohere/command-a-plus-05-2026": {
    attachment: true,
    family: "command-a",
    id: "cohere/command-a-plus-05-2026",
    knowledge: "2025-04-01",
    last_updated: "2026-06-09",
    limit: {
      context: 128000,
      output: 64000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Command A Plus",
    open_weights: true,
    reasoning: true,
    release_date: "2026-05-20",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "cohere/command-r-08-2024": {
    attachment: false,
    family: "command-r",
    id: "cohere/command-r-08-2024",
    knowledge: "2024-06-01",
    last_updated: "2024-08-30",
    limit: {
      context: 128000,
      output: 4000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Command R",
    open_weights: true,
    reasoning: false,
    release_date: "2024-08-30",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/CohereLabs/c4ai-command-r-08-2024"
      }
    ]
  },
  "cohere/command-r-plus-08-2024": {
    attachment: false,
    family: "command-r",
    id: "cohere/command-r-plus-08-2024",
    knowledge: "2024-06-01",
    last_updated: "2024-08-30",
    limit: {
      context: 128000,
      output: 4000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Command R+",
    open_weights: true,
    reasoning: false,
    release_date: "2024-08-30",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/CohereLabs/c4ai-command-r-plus-08-2024"
      }
    ]
  },
  "cohere/command-r7b-12-2024": {
    attachment: false,
    family: "command-r",
    id: "cohere/command-r7b-12-2024",
    knowledge: "2024-06-01",
    last_updated: "2024-12-02",
    limit: {
      context: 128000,
      output: 4000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Command R7B",
    open_weights: true,
    reasoning: false,
    release_date: "2024-12-02",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/CohereLabs/c4ai-command-r7b-12-2024"
      }
    ]
  },
  "cohere/north-mini-code-1-0": {
    attachment: false,
    family: "north",
    id: "cohere/north-mini-code-1-0",
    knowledge: "2025-09-23",
    last_updated: "2026-06-09",
    limit: {
      context: 256000,
      output: 64000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "North Mini Code",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-09",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "deepseek/deepseek-chat": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 70.2,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "deepseek",
    id: "deepseek/deepseek-chat",
    knowledge: "2025-09",
    last_updated: "2026-02-28",
    limit: {
      context: 1e6,
      output: 384000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "DeepSeek Chat",
    open_weights: true,
    reasoning: false,
    release_date: "2025-12-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2"
      }
    ]
  },
  "deepseek/deepseek-r1": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 56.9,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 15.9,
        source: "https://openrouter.ai/deepseek/deepseek-r1/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 35.7,
        source: "https://openrouter.ai/deepseek/deepseek-r1/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 6.1,
        source: "https://openrouter.ai/deepseek/deepseek-r1/benchmarks"
      }
    ],
    family: "deepseek-thinking",
    id: "deepseek/deepseek-r1",
    knowledge: "2024-07",
    last_updated: "2025-05-29",
    limit: {
      context: 128000,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "DeepSeek-R1",
    open_weights: true,
    reasoning: true,
    release_date: "2025-01-20",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-R1"
      }
    ]
  },
  "deepseek/deepseek-reasoner": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 74.2,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "deepseek-thinking",
    id: "deepseek/deepseek-reasoner",
    knowledge: "2025-09",
    last_updated: "2026-02-28",
    limit: {
      context: 1e6,
      output: 384000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "DeepSeek Reasoner",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2"
      }
    ]
  },
  "deepseek/deepseek-v4-flash": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 79,
        source: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash"
      }
    ],
    family: "deepseek-flash",
    id: "deepseek/deepseek-v4-flash",
    knowledge: "2025-05",
    last_updated: "2026-04-24",
    limit: {
      context: 1e6,
      output: 384000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "DeepSeek V4 Flash",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-24",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash"
      }
    ]
  },
  "deepseek/deepseek-v4-pro": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 80.6,
        source: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 50.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 67.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 18,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 64.7,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "deepseek-thinking",
    id: "deepseek/deepseek-v4-pro",
    knowledge: "2025-05",
    last_updated: "2026-04-24",
    limit: {
      context: 1e6,
      output: 384000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "DeepSeek V4 Pro",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-24",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro"
      }
    ]
  },
  "google/gemini-2.0-flash": {
    attachment: true,
    family: "gemini-flash",
    id: "google/gemini-2.0-flash",
    knowledge: "2024-06",
    last_updated: "2024-12-11",
    limit: {
      context: 1048576,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 2.0 Flash",
    open_weights: false,
    reasoning: false,
    release_date: "2024-12-11",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-2.0-flash-lite": {
    attachment: true,
    family: "gemini-flash-lite",
    id: "google/gemini-2.0-flash-lite",
    knowledge: "2024-06",
    last_updated: "2024-12-11",
    limit: {
      context: 1048576,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 2.0 Flash-Lite",
    open_weights: false,
    reasoning: false,
    release_date: "2024-12-11",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-2.5-flash": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 55.1,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 22.2,
        source: "https://openrouter.ai/google/gemini-2.5-flash/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 39.4,
        source: "https://openrouter.ai/google/gemini-2.5-flash/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 13.6,
        source: "https://openrouter.ai/google/gemini-2.5-flash/benchmarks"
      }
    ],
    family: "gemini-flash",
    id: "google/gemini-2.5-flash",
    knowledge: "2025-01",
    last_updated: "2025-06-17",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 2.5 Flash",
    open_weights: false,
    reasoning: true,
    release_date: "2025-06-17",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-2.5-flash-image": {
    attachment: true,
    family: "gemini-flash",
    id: "google/gemini-2.5-flash-image",
    knowledge: "2025-06",
    last_updated: "2025-08-26",
    limit: {
      context: 32768,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text",
        "image"
      ]
    },
    name: "Nano Banana",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-26",
    temperature: true,
    tool_call: false
  },
  "google/gemini-2.5-flash-lite": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 9.5,
        source: "https://openrouter.ai/google/gemini-2.5-flash-lite/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 19.3,
        source: "https://openrouter.ai/google/gemini-2.5-flash-lite/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 4.5,
        source: "https://openrouter.ai/google/gemini-2.5-flash-lite/benchmarks"
      }
    ],
    family: "gemini-flash-lite",
    id: "google/gemini-2.5-flash-lite",
    knowledge: "2025-01",
    last_updated: "2025-06-17",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 2.5 Flash-Lite",
    open_weights: false,
    reasoning: true,
    release_date: "2025-06-17",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-2.5-flash-tts": {
    attachment: false,
    family: "gemini-flash",
    id: "google/gemini-2.5-flash-tts",
    knowledge: "2025-01",
    last_updated: "2025-12-10",
    limit: {
      context: 32768,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "audio"
      ]
    },
    name: "Gemini 2.5 Flash TTS",
    open_weights: false,
    reasoning: false,
    release_date: "2025-09-30",
    temperature: true,
    tool_call: false
  },
  "google/gemini-2.5-pro": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 83.1,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 32,
        source: "https://openrouter.ai/google/gemini-2.5-pro/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 42.8,
        source: "https://openrouter.ai/google/gemini-2.5-pro/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 26.5,
        source: "https://openrouter.ai/google/gemini-2.5-pro/benchmarks"
      }
    ],
    family: "gemini-pro",
    id: "google/gemini-2.5-pro",
    knowledge: "2025-01",
    last_updated: "2025-06-17",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 2.5 Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-06-17",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-2.5-pro-tts": {
    attachment: false,
    family: "gemini-pro",
    id: "google/gemini-2.5-pro-tts",
    knowledge: "2025-01",
    last_updated: "2025-12-10",
    limit: {
      context: 32768,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "audio"
      ]
    },
    name: "Gemini 2.5 Pro TTS",
    open_weights: false,
    reasoning: false,
    release_date: "2025-09-30",
    temperature: false,
    tool_call: false
  },
  "google/gemini-3-flash-preview": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 34.63,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 8.2,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 10,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 30.3,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      }
    ],
    family: "gemini-flash",
    id: "google/gemini-3-flash-preview",
    knowledge: "2025-01",
    last_updated: "2025-12-17",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3 Flash Preview",
    open_weights: false,
    reasoning: true,
    release_date: "2025-12-17",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3-pro-image-preview": {
    attachment: true,
    family: "gemini-pro",
    id: "google/gemini-3-pro-image-preview",
    knowledge: "2025-01",
    last_updated: "2025-11-20",
    limit: {
      context: 65536,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text",
        "image"
      ]
    },
    name: "Nano Banana Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-20",
    temperature: true,
    tool_call: false
  },
  "google/gemini-3-pro-preview": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 43.3,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "gemini-pro",
    id: "google/gemini-3-pro-preview",
    knowledge: "2025-01",
    last_updated: "2025-11-18",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3 Pro Preview",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-18",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3.1-flash-image-preview": {
    attachment: true,
    family: "gemini-flash",
    id: "google/gemini-3.1-flash-image-preview",
    knowledge: "2025-01",
    last_updated: "2026-02-26",
    limit: {
      context: 65536,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text",
        "image"
      ]
    },
    name: "Nano Banana 2",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-26",
    temperature: true,
    tool_call: false
  },
  "google/gemini-3.1-flash-lite": {
    attachment: true,
    family: "gemini-flash-lite",
    id: "google/gemini-3.1-flash-lite",
    knowledge: "2025-01",
    last_updated: "2026-05-07",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3.1 Flash Lite",
    open_weights: false,
    reasoning: true,
    release_date: "2026-05-07",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3.1-flash-lite-preview": {
    attachment: true,
    family: "gemini-flash-lite",
    id: "google/gemini-3.1-flash-lite-preview",
    knowledge: "2025-01",
    last_updated: "2026-03-03",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3.1 Flash Lite Preview",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-03",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3.1-pro-preview": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 54.2,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench",
        score: 70.3,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 46.1,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 13.5,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 33.81,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 29.84,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 43,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 45.6,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 15.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 68.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "gemini-pro",
    id: "google/gemini-3.1-pro-preview",
    knowledge: "2025-01",
    last_updated: "2026-02-19",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3.1 Pro Preview",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-19",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3.1-pro-preview-customtools": {
    attachment: true,
    family: "gemini-pro",
    id: "google/gemini-3.1-pro-preview-customtools",
    knowledge: "2025-01",
    last_updated: "2026-02-19",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3.1 Pro Preview Custom Tools",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-19",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-3.5-flash": {
    attachment: true,
    family: "gemini-flash",
    id: "google/gemini-3.5-flash",
    knowledge: "2025-01",
    last_updated: "2026-05-19",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini 3.5 Flash",
    open_weights: false,
    reasoning: true,
    release_date: "2026-05-19",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-embedding-001": {
    attachment: false,
    family: "gemini",
    id: "google/gemini-embedding-001",
    knowledge: "2025-05",
    last_updated: "2025-05-20",
    limit: {
      context: 2048,
      output: 1
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini Embedding 001",
    open_weights: false,
    reasoning: false,
    release_date: "2025-05-20",
    temperature: false,
    tool_call: false
  },
  "google/gemini-flash-latest": {
    attachment: true,
    family: "gemini-flash",
    id: "google/gemini-flash-latest",
    knowledge: "2025-01",
    last_updated: "2025-09-25",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini Flash Latest",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-25",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemini-flash-lite-latest": {
    attachment: true,
    family: "gemini-flash-lite",
    id: "google/gemini-flash-lite-latest",
    knowledge: "2025-01",
    last_updated: "2025-09-25",
    limit: {
      context: 1048576,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemini Flash-Lite Latest",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-25",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "google/gemma-4-26b-a4b-it": {
    attachment: true,
    family: "gemma",
    id: "google/gemma-4-26b-a4b-it",
    last_updated: "2026-04-02",
    limit: {
      context: 262144,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemma 4 26B A4B IT",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-02",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/google/gemma-4-26B-A4B-it"
      }
    ]
  },
  "google/gemma-4-31b-it": {
    attachment: true,
    family: "gemma",
    id: "google/gemma-4-31b-it",
    last_updated: "2026-04-02",
    limit: {
      context: 262144,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemma 4 31B IT",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-02",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/google/gemma-4-31B-it"
      }
    ]
  },
  "google/gemma-4-E2B-it": {
    attachment: true,
    family: "gemma",
    id: "google/gemma-4-E2B-it",
    last_updated: "2026-04-02",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemma 4 E2B IT",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-02",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/google/gemma-4-E2B-it"
      }
    ]
  },
  "google/gemma-4-E4B-it": {
    attachment: true,
    family: "gemma",
    id: "google/gemma-4-E4B-it",
    last_updated: "2026-04-02",
    limit: {
      context: 131072,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Gemma 4 E4B IT",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-02",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/google/gemma-4-E4B-it"
      }
    ]
  },
  "meta/llama-3.3-70b-instruct": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 10.7,
        source: "https://openrouter.ai/meta-llama/llama-3.3-70b-instruct/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 26,
        source: "https://openrouter.ai/meta-llama/llama-3.3-70b-instruct/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 3,
        source: "https://openrouter.ai/meta-llama/llama-3.3-70b-instruct/benchmarks"
      }
    ],
    family: "llama",
    id: "meta/llama-3.3-70b-instruct",
    knowledge: "2023-12",
    last_updated: "2024-12-06",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama-3.3-70B-Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2024-12-06",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct"
      }
    ]
  },
  "meta/llama-4-maverick-17b-instruct": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 15.6,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 5.24,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "llama",
    id: "meta/llama-4-maverick-17b-instruct",
    knowledge: "2024-08",
    last_updated: "2025-04-05",
    limit: {
      context: 1e6,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 4 Maverick 17B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-04-05",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct"
      }
    ]
  },
  "meta/llama-4-scout-17b-instruct": {
    attachment: true,
    family: "llama",
    id: "meta/llama-4-scout-17b-instruct",
    knowledge: "2024-08",
    last_updated: "2025-04-05",
    limit: {
      context: 3500000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 4 Scout 17B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-04-05",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct"
      }
    ]
  },
  "minimax/MiniMax-M2": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 69.4,
        source: "https://huggingface.co/MiniMaxAI/MiniMax-M2"
      }
    ],
    family: "minimax",
    id: "minimax/MiniMax-M2",
    last_updated: "2025-10-27",
    limit: {
      context: 196608,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2",
    open_weights: true,
    reasoning: true,
    release_date: "2025-10-27",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2"
      }
    ]
  },
  "minimax/MiniMax-M2.1": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 74,
        source: "https://huggingface.co/MiniMaxAI/MiniMax-M2.1"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 36.81,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "minimax",
    id: "minimax/MiniMax-M2.1",
    last_updated: "2025-12-23",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2.1",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-23",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.1"
      }
    ]
  },
  "minimax/MiniMax-M2.5": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 75.8,
        source: "https://www.swebench.com/"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 10.3,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 19.52,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 18.6,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      }
    ],
    family: "minimax",
    id: "minimax/MiniMax-M2.5",
    last_updated: "2026-02-12",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2.5",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-12",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.5"
      }
    ]
  },
  "minimax/MiniMax-M2.5-highspeed": {
    attachment: false,
    family: "minimax",
    id: "minimax/MiniMax-M2.5-highspeed",
    last_updated: "2026-02-13",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2.5-highspeed",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-13",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.5"
      }
    ]
  },
  "minimax/MiniMax-M2.7": {
    attachment: false,
    family: "minimax",
    id: "minimax/MiniMax-M2.7",
    last_updated: "2026-03-18",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2.7",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-18",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.7"
      }
    ]
  },
  "minimax/MiniMax-M2.7-highspeed": {
    attachment: false,
    family: "minimax",
    id: "minimax/MiniMax-M2.7-highspeed",
    last_updated: "2026-03-18",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M2.7-highspeed",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-18",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.7"
      }
    ]
  },
  "minimax/MiniMax-M3": {
    attachment: true,
    family: "minimax",
    id: "minimax/MiniMax-M3",
    last_updated: "2026-06-01",
    limit: {
      context: 512000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "MiniMax-M3",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M3"
      }
    ]
  },
  "mistral/codestral-latest": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 11.1,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "codestral",
    id: "mistral/codestral-latest",
    knowledge: "2024-10",
    last_updated: "2025-01-04",
    limit: {
      context: 256000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Codestral (latest)",
    open_weights: true,
    reasoning: false,
    release_date: "2024-05-29",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Codestral-22B-v0.1"
      }
    ]
  },
  "mistral/devstral-2512": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 23.7,
        source: "https://openrouter.ai/mistralai/devstral-2512/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 33.1,
        source: "https://openrouter.ai/mistralai/devstral-2512/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 18.9,
        source: "https://openrouter.ai/mistralai/devstral-2512/benchmarks"
      }
    ],
    family: "devstral",
    id: "mistral/devstral-2512",
    knowledge: "2025-12",
    last_updated: "2025-12-09",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Devstral 2",
    open_weights: true,
    reasoning: false,
    release_date: "2025-12-09",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512"
      }
    ]
  },
  "mistral/devstral-medium-2507": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 61.6,
        source: "https://mistral.ai/news/devstral-2507"
      }
    ],
    family: "devstral",
    id: "mistral/devstral-medium-2507",
    knowledge: "2025-05",
    last_updated: "2025-07-10",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Devstral Medium",
    open_weights: false,
    reasoning: false,
    release_date: "2025-07-10",
    temperature: true,
    tool_call: true
  },
  "mistral/devstral-medium-latest": {
    attachment: false,
    family: "devstral",
    id: "mistral/devstral-medium-latest",
    knowledge: "2025-12",
    last_updated: "2025-12-02",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Devstral 2 (latest)",
    open_weights: true,
    reasoning: false,
    release_date: "2025-12-02",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512"
      }
    ]
  },
  "mistral/devstral-small-2507": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 53.6,
        source: "https://mistral.ai/news/devstral-2507"
      }
    ],
    family: "devstral",
    id: "mistral/devstral-small-2507",
    knowledge: "2025-05",
    last_updated: "2025-07-10",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Devstral Small",
    open_weights: true,
    reasoning: false,
    release_date: "2025-07-10",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Devstral-Small-2507"
      }
    ]
  },
  "mistral/magistral-medium-latest": {
    attachment: false,
    family: "magistral-medium",
    id: "mistral/magistral-medium-latest",
    knowledge: "2025-06",
    last_updated: "2025-03-20",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Magistral Medium (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-03-17",
    temperature: true,
    tool_call: true
  },
  "mistral/mistral-large-2411": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 13.8,
        source: "https://openrouter.ai/mistralai/mistral-large-2407/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 29.2,
        source: "https://openrouter.ai/mistralai/mistral-large-2407/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 6.1,
        source: "https://openrouter.ai/mistralai/mistral-large-2407/benchmarks"
      }
    ],
    family: "mistral-large",
    id: "mistral/mistral-large-2411",
    knowledge: "2024-11",
    last_updated: "2024-11-18",
    limit: {
      context: 131072,
      output: 16384
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Large 2.1",
    open_weights: true,
    reasoning: false,
    release_date: "2024-11-18",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Large-Instruct-2411"
      }
    ]
  },
  "mistral/mistral-large-2512": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 22.7,
        source: "https://openrouter.ai/mistralai/mistral-large-2512/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 36.2,
        source: "https://openrouter.ai/mistralai/mistral-large-2512/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 15.9,
        source: "https://openrouter.ai/mistralai/mistral-large-2512/benchmarks"
      }
    ],
    family: "mistral-large",
    id: "mistral/mistral-large-2512",
    knowledge: "2024-11",
    last_updated: "2025-12-02",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Large 3",
    open_weights: true,
    reasoning: false,
    release_date: "2024-11-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512"
      }
    ]
  },
  "mistral/mistral-large-latest": {
    attachment: true,
    family: "mistral-large",
    id: "mistral/mistral-large-latest",
    knowledge: "2024-11",
    last_updated: "2025-12-02",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Large (latest)",
    open_weights: true,
    reasoning: false,
    release_date: "2024-11-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512"
      }
    ]
  },
  "mistral/mistral-medium-2505": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 13.6,
        source: "https://openrouter.ai/mistralai/mistral-medium-3/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 33.1,
        source: "https://openrouter.ai/mistralai/mistral-medium-3/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 3.8,
        source: "https://openrouter.ai/mistralai/mistral-medium-3/benchmarks"
      }
    ],
    family: "mistral-medium",
    id: "mistral/mistral-medium-2505",
    knowledge: "2025-05",
    last_updated: "2025-05-07",
    limit: {
      context: 131072,
      output: 131072
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Medium 3",
    open_weights: false,
    reasoning: false,
    release_date: "2025-05-07",
    temperature: true,
    tool_call: true
  },
  "mistral/mistral-medium-2604": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 77.6,
        source: "https://huggingface.co/mistralai/Mistral-Medium-3.5-128B"
      }
    ],
    family: "mistral-medium",
    id: "mistral/mistral-medium-2604",
    last_updated: "2026-04-29",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Medium 3.5",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-29",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Medium-3.5-128B"
      }
    ]
  },
  "mistral/mistral-medium-latest": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 77.6,
        source: "https://huggingface.co/mistralai/Mistral-Medium-3.5-128B"
      }
    ],
    family: "mistral-medium",
    id: "mistral/mistral-medium-latest",
    knowledge: "2025-05",
    last_updated: "2025-08-12",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Medium (latest)",
    open_weights: false,
    reasoning: false,
    release_date: "2025-08-12",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Medium-3.5-128B"
      }
    ]
  },
  "mistral/mistral-nemo": {
    attachment: false,
    family: "mistral-nemo",
    id: "mistral/mistral-nemo",
    knowledge: "2024-07",
    last_updated: "2024-07-01",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Nemo",
    open_weights: true,
    reasoning: false,
    release_date: "2024-07-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407"
      }
    ]
  },
  "mistral/mistral-small-2506": {
    attachment: false,
    family: "mistral-small",
    id: "mistral/mistral-small-2506",
    knowledge: "2025-03",
    last_updated: "2025-06-20",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Small 3.2",
    open_weights: true,
    reasoning: false,
    release_date: "2025-06-20",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506"
      }
    ]
  },
  "mistral/mistral-small-2603": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 24.3,
        source: "https://openrouter.ai/mistralai/mistral-small-2603/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 38,
        source: "https://openrouter.ai/mistralai/mistral-small-2603/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 17.4,
        source: "https://openrouter.ai/mistralai/mistral-small-2603/benchmarks"
      }
    ],
    family: "mistral-small",
    id: "mistral/mistral-small-2603",
    knowledge: "2025-06",
    last_updated: "2026-03-16",
    limit: {
      context: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Small 4",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-16",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Small-4-119B-2603"
      }
    ]
  },
  "mistral/mistral-small-latest": {
    attachment: true,
    family: "mistral-small",
    id: "mistral/mistral-small-latest",
    knowledge: "2025-06",
    last_updated: "2026-03-16",
    limit: {
      context: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Small (latest)",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-16",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Mistral-Small-4-119B-2603"
      }
    ]
  },
  "mistral/pixtral-12b": {
    attachment: true,
    family: "pixtral",
    id: "mistral/pixtral-12b",
    knowledge: "2024-09",
    last_updated: "2024-09-01",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Pixtral 12B",
    open_weights: true,
    reasoning: false,
    release_date: "2024-09-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Pixtral-12B-2409"
      }
    ]
  },
  "mistral/pixtral-large-latest": {
    attachment: true,
    family: "pixtral",
    id: "mistral/pixtral-large-latest",
    knowledge: "2024-11",
    last_updated: "2024-11-04",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Pixtral Large (latest)",
    open_weights: true,
    reasoning: false,
    release_date: "2024-11-01",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/mistralai/Pixtral-Large-Instruct-2411"
      }
    ]
  },
  "moonshotai/kimi-k2-thinking": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 71.3,
        source: "https://huggingface.co/moonshotai/Kimi-K2-Thinking"
      }
    ],
    family: "kimi-thinking",
    id: "moonshotai/kimi-k2-thinking",
    knowledge: "2024-08",
    last_updated: "2025-11-06",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2 Thinking",
    open_weights: true,
    reasoning: true,
    release_date: "2025-11-06",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2-Thinking"
      }
    ]
  },
  "moonshotai/kimi-k2-thinking-turbo": {
    attachment: false,
    family: "kimi-thinking",
    id: "moonshotai/kimi-k2-thinking-turbo",
    knowledge: "2024-08",
    last_updated: "2025-11-06",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2 Thinking Turbo",
    open_weights: true,
    reasoning: true,
    release_date: "2025-11-06",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2-Thinking"
      }
    ]
  },
  "moonshotai/kimi-k2.5": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 70.8,
        source: "https://www.swebench.com/"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 13.1,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 20.95,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 25.77,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      }
    ],
    family: "kimi-k2",
    id: "moonshotai/kimi-k2.5",
    knowledge: "2025-01",
    last_updated: "2026-01",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2.5",
    open_weights: true,
    reasoning: true,
    release_date: "2026-01",
    structured_output: true,
    temperature: false,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2.5"
      }
    ]
  },
  "moonshotai/kimi-k2.6": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 80.2,
        source: "https://huggingface.co/moonshotai/Kimi-K2.6"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 50.5,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 59.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 27.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 64.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "kimi-k2",
    id: "moonshotai/kimi-k2.6",
    knowledge: "2025-01",
    last_updated: "2026-04-21",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2.6",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-21",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2.6"
      }
    ]
  },
  "moonshotai/kimi-k2.7-code": {
    attachment: true,
    family: "kimi-k2",
    id: "moonshotai/kimi-k2.7-code",
    knowledge: "2025-01",
    last_updated: "2026-06-12",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2.7 Code",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-12",
    structured_output: true,
    temperature: false,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2.7-Code"
      }
    ]
  },
  "moonshotai/kimi-k2.7-code-highspeed": {
    attachment: true,
    family: "kimi-k2",
    id: "moonshotai/kimi-k2.7-code-highspeed",
    knowledge: "2025-01",
    last_updated: "2026-06-12",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Kimi K2.7 Code Highspeed",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-12",
    structured_output: true,
    temperature: false,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/moonshotai/Kimi-K2.7-Code"
      }
    ]
  },
  "nvidia/llama-3.1-nemotron-70b-instruct": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    last_updated: "2025-04-15",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 3.1 Nemotron 70B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2025-04-15",
    temperature: true,
    tool_call: true
  },
  "nvidia/llama-3.1-nemotron-safety-guard-8b-v3": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
    last_updated: "2025-10-28",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 3.1 Nemotron Safety Guard 8B v3",
    open_weights: true,
    reasoning: false,
    release_date: "2025-10-28",
    temperature: false,
    tool_call: false
  },
  "nvidia/llama-3.1-nemotron-ultra-253b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/llama-3.1-nemotron-ultra-253b",
    last_updated: "2025-04-07",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 3.1 Nemotron Ultra 253B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-04-07",
    temperature: true,
    tool_call: true
  },
  "nvidia/llama-3.3-nemotron-super-49b-v1": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    last_updated: "2025-04-07",
    limit: {
      context: 131072,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 3.3 Nemotron Super 49B v1",
    open_weights: true,
    reasoning: true,
    release_date: "2025-04-07",
    temperature: true,
    tool_call: true
  },
  "nvidia/llama-3.3-nemotron-super-49b-v1.5": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    last_updated: "2025-07-25",
    limit: {
      context: 131072,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama 3.3 Nemotron Super 49B v1.5",
    open_weights: true,
    reasoning: true,
    release_date: "2025-07-25",
    temperature: true,
    tool_call: true
  },
  "nvidia/llama-nemotron-embed-vl-1b-v2": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/llama-nemotron-embed-vl-1b-v2",
    last_updated: "2026-02-10",
    limit: {
      context: 32768,
      output: 2048
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama Nemotron Embed VL 1B v2",
    open_weights: true,
    reasoning: false,
    release_date: "2026-02-10",
    temperature: false,
    tool_call: false
  },
  "nvidia/llama-nemotron-rerank-vl-1b-v2": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/llama-nemotron-rerank-vl-1b-v2",
    last_updated: "2026-03-31",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Llama Nemotron Rerank VL 1B v2",
    open_weights: true,
    reasoning: false,
    release_date: "2026-03-31",
    temperature: false,
    tool_call: false
  },
  "nvidia/mistral-nemotron": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/mistral-nemotron",
    last_updated: "2025-06-12",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Mistral Nemotron",
    open_weights: true,
    reasoning: false,
    release_date: "2025-06-11",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-3-content-safety": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-3-content-safety",
    last_updated: "2026-04-16",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3 Content Safety",
    open_weights: true,
    reasoning: false,
    release_date: "2026-04-16",
    temperature: false,
    tool_call: false
  },
  "nvidia/nemotron-3-nano-30b-a3b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-3-nano-30b-a3b",
    last_updated: "2025-12-15",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3 Nano 30B A3B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-15",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    last_updated: "2026-04-28",
    limit: {
      context: 256000,
      output: 65536
    },
    modalities: {
      input: [
        "text",
        "image",
        "video",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3 Nano Omni 30B A3B Reasoning",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-28",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-3-super-120b-a12b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-3-super-120b-a12b",
    last_updated: "2026-03-11",
    limit: {
      context: 262144,
      output: 262144
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3 Super 120B A12B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-11",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-3-ultra-550b-a55b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    last_updated: "2026-06-04",
    limit: {
      context: 1e6,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3 Ultra 550B A55B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-04",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-3.5-content-safety": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/nemotron-3.5-content-safety",
    last_updated: "2026-06-04",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron 3.5 Content Safety",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-04",
    temperature: true,
    tool_call: false
  },
  "nvidia/nemotron-cascade-2-30b-a3b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-cascade-2-30b-a3b",
    last_updated: "2026-04-09",
    limit: {
      context: 256000,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron Cascade 2 30B A3B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-03-24",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-content-safety-reasoning-4b": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-content-safety-reasoning-4b",
    last_updated: "2026-01-22",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron Content Safety Reasoning 4B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-01-22",
    temperature: false,
    tool_call: false
  },
  "nvidia/nemotron-mini-4b-instruct": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-mini-4b-instruct",
    last_updated: "2024-08-26",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron Mini 4B Instruct",
    open_weights: true,
    reasoning: false,
    release_date: "2024-08-21",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-nano-12b-v2-vl": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/nemotron-nano-12b-v2-vl",
    last_updated: "2025-10-28",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron Nano 12B v2 VL",
    open_weights: true,
    reasoning: true,
    release_date: "2025-10-28",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-nano-9b-v2": {
    attachment: false,
    family: "nemotron",
    id: "nvidia/nemotron-nano-9b-v2",
    last_updated: "2025-08-18",
    limit: {
      context: 131072,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron Nano 9B v2",
    open_weights: true,
    reasoning: true,
    release_date: "2025-08-18",
    temperature: true,
    tool_call: true
  },
  "nvidia/nemotron-voicechat": {
    attachment: true,
    family: "nemotron",
    id: "nvidia/nemotron-voicechat",
    last_updated: "2026-03-16",
    limit: {
      context: 128000,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Nemotron VoiceChat",
    open_weights: true,
    reasoning: false,
    release_date: "2026-03-16",
    temperature: true,
    tool_call: true
  },
  "openai/gpt-3.5-turbo": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 10.7,
        source: "https://openrouter.ai/openai/gpt-3.5-turbo/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-3.5-turbo",
    knowledge: "2021-09-01",
    last_updated: "2023-11-06",
    limit: {
      context: 16385,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-3.5-turbo",
    open_weights: false,
    reasoning: false,
    release_date: "2023-03-01",
    structured_output: false,
    temperature: true,
    tool_call: false
  },
  "openai/gpt-4": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 13.1,
        source: "https://openrouter.ai/openai/gpt-4/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4",
    knowledge: "2023-11",
    last_updated: "2024-04-09",
    limit: {
      context: 8192,
      output: 8192
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4",
    open_weights: false,
    reasoning: false,
    release_date: "2023-11-06",
    structured_output: false,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4-turbo": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 21.5,
        source: "https://openrouter.ai/openai/gpt-4-turbo/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 31.9,
        source: "https://openrouter.ai/openai/gpt-4-turbo/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4-turbo",
    knowledge: "2023-12",
    last_updated: "2024-04-09",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4 Turbo",
    open_weights: false,
    reasoning: false,
    release_date: "2023-11-06",
    structured_output: false,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4.1": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 52.4,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4.1",
    knowledge: "2024-04",
    last_updated: "2025-04-14",
    limit: {
      context: 1047576,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4.1",
    open_weights: false,
    reasoning: false,
    release_date: "2025-04-14",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4.1-mini": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 32.4,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "gpt-mini",
    id: "openai/gpt-4.1-mini",
    knowledge: "2024-04",
    last_updated: "2025-04-14",
    limit: {
      context: 1047576,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4.1 mini",
    open_weights: false,
    reasoning: false,
    release_date: "2025-04-14",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4.1-nano": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 8.9,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "gpt-nano",
    id: "openai/gpt-4.1-nano",
    knowledge: "2024-04",
    last_updated: "2025-04-14",
    limit: {
      context: 1047576,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4.1 nano",
    open_weights: false,
    reasoning: false,
    release_date: "2025-04-14",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4o": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 23.1,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4o",
    knowledge: "2023-09",
    last_updated: "2024-08-06",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4o",
    open_weights: false,
    reasoning: false,
    release_date: "2024-05-13",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4o-2024-05-13": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 24.2,
        source: "https://openrouter.ai/openai/gpt-4o-2024-05-13/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 30.9,
        source: "https://openrouter.ai/openai/gpt-4o-2024-05-13/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4o-2024-05-13",
    knowledge: "2023-09",
    last_updated: "2024-05-13",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4o (2024-05-13)",
    open_weights: false,
    reasoning: false,
    release_date: "2024-05-13",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4o-2024-08-06": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 23.1,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 16.6,
        source: "https://openrouter.ai/openai/gpt-4o-2024-08-06/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 33.1,
        source: "https://openrouter.ai/openai/gpt-4o-2024-08-06/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 8.3,
        source: "https://openrouter.ai/openai/gpt-4o-2024-08-06/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4o-2024-08-06",
    knowledge: "2023-09",
    last_updated: "2024-08-06",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4o (2024-08-06)",
    open_weights: false,
    reasoning: false,
    release_date: "2024-08-06",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4o-2024-11-20": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 18.2,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 16.7,
        source: "https://openrouter.ai/openai/gpt-4o-2024-11-20/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 33.3,
        source: "https://openrouter.ai/openai/gpt-4o-2024-11-20/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 8.3,
        source: "https://openrouter.ai/openai/gpt-4o-2024-11-20/benchmarks"
      }
    ],
    family: "gpt",
    id: "openai/gpt-4o-2024-11-20",
    knowledge: "2023-09",
    last_updated: "2024-11-20",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4o (2024-11-20)",
    open_weights: false,
    reasoning: false,
    release_date: "2024-11-20",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-4o-mini": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 3.6,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 22.9,
        source: "https://openrouter.ai/openai/gpt-4o-mini/benchmarks"
      }
    ],
    family: "gpt-mini",
    id: "openai/gpt-4o-mini",
    knowledge: "2023-09",
    last_updated: "2024-07-18",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-4o mini",
    open_weights: false,
    reasoning: false,
    release_date: "2024-07-18",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-5": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 88,
        source: "https://aider.chat/docs/leaderboards/"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 41.78,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "gpt",
    id: "openai/gpt-5",
    knowledge: "2024-09-30",
    last_updated: "2025-08-07",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-07",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5-chat-latest": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5-chat-latest",
    knowledge: "2024-09-30",
    last_updated: "2025-08-07",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5 Chat (latest)",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-07",
    structured_output: true,
    temperature: true,
    tool_call: false
  },
  "openai/gpt-5-codex": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 38.9,
        source: "https://openrouter.ai/openai/gpt-5-codex/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 40.9,
        source: "https://openrouter.ai/openai/gpt-5-codex/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 37.9,
        source: "https://openrouter.ai/openai/gpt-5-codex/benchmarks"
      }
    ],
    family: "gpt-codex",
    id: "openai/gpt-5-codex",
    knowledge: "2024-09-30",
    last_updated: "2025-09-15",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5-Codex",
    open_weights: false,
    reasoning: true,
    release_date: "2025-09-15",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5-mini": {
    attachment: true,
    family: "gpt-mini",
    id: "openai/gpt-5-mini",
    knowledge: "2024-05-30",
    last_updated: "2025-08-07",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5 Mini",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-07",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5-nano": {
    attachment: true,
    family: "gpt-nano",
    id: "openai/gpt-5-nano",
    knowledge: "2024-05-30",
    last_updated: "2025-08-07",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5 Nano",
    open_weights: false,
    reasoning: true,
    release_date: "2025-08-07",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5-pro": {
    attachment: true,
    family: "gpt-pro",
    id: "openai/gpt-5-pro",
    knowledge: "2024-09-30",
    last_updated: "2025-10-06",
    limit: {
      context: 400000,
      input: 272000,
      output: 272000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5 Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-10-06",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.1": {
    attachment: true,
    family: "gpt",
    id: "openai/gpt-5.1",
    knowledge: "2024-09-30",
    last_updated: "2025-11-13",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.1",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-13",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.1-chat-latest": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5.1-chat-latest",
    knowledge: "2024-09-30",
    last_updated: "2025-11-13",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.1 Chat",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-13",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.1-codex": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5.1-codex",
    knowledge: "2024-09-30",
    last_updated: "2025-11-13",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.1 Codex",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-13",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.1-codex-max": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5.1-codex-max",
    knowledge: "2024-09-30",
    last_updated: "2025-11-13",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.1 Codex Max",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-13",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.1-codex-mini": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5.1-codex-mini",
    knowledge: "2024-09-30",
    last_updated: "2025-11-13",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.1 Codex mini",
    open_weights: false,
    reasoning: true,
    release_date: "2025-11-13",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.2": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 29.94,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "gpt",
    id: "openai/gpt-5.2",
    knowledge: "2025-08-31",
    last_updated: "2025-12-11",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.2",
    open_weights: false,
    reasoning: true,
    release_date: "2025-12-11",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.2-chat-latest": {
    attachment: true,
    family: "gpt-codex",
    id: "openai/gpt-5.2-chat-latest",
    knowledge: "2025-08-31",
    last_updated: "2025-12-11",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.2 Chat",
    open_weights: false,
    reasoning: true,
    release_date: "2025-12-11",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.2-codex": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 41.04,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "gpt-codex",
    id: "openai/gpt-5.2-codex",
    knowledge: "2025-08-31",
    last_updated: "2025-12-11",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.2 Codex",
    open_weights: false,
    reasoning: true,
    release_date: "2025-12-11",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.2-pro": {
    attachment: true,
    family: "gpt-pro",
    id: "openai/gpt-5.2-pro",
    knowledge: "2025-08-31",
    last_updated: "2025-12-11",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.2 Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-12-11",
    structured_output: false,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.3-chat-latest": {
    attachment: true,
    family: "gpt",
    id: "openai/gpt-5.3-chat-latest",
    knowledge: "2025-08-31",
    last_updated: "2026-03-03",
    limit: {
      context: 128000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.3 Chat (latest)",
    open_weights: false,
    reasoning: false,
    release_date: "2026-03-03",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-5.3-codex": {
    attachment: true,
    benchmarks: [
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 32.6,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 42.38,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 38.98,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      }
    ],
    family: "gpt-codex",
    id: "openai/gpt-5.3-codex",
    knowledge: "2025-08-31",
    last_updated: "2026-02-05",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.3 Codex",
    open_weights: false,
    reasoning: true,
    release_date: "2026-02-05",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.4": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 59.1,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 40.8,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 36.3,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 44.29,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 44.36,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 40,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 53.6,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 72.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 18.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 69.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 52.2,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 72.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 18.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 64.7,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "gpt",
    id: "openai/gpt-5.4",
    knowledge: "2025-08-31",
    last_updated: "2026-03-05",
    limit: {
      context: 1050000,
      input: 922000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.4",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-05",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.4-mini": {
    attachment: true,
    family: "gpt-mini",
    id: "openai/gpt-5.4-mini",
    knowledge: "2025-08-31",
    last_updated: "2026-03-17",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.4 mini",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-17",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.4-nano": {
    attachment: true,
    family: "gpt-nano",
    id: "openai/gpt-5.4-nano",
    knowledge: "2025-08-31",
    last_updated: "2026-03-17",
    limit: {
      context: 400000,
      input: 272000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.4 nano",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-17",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.4-pro": {
    attachment: true,
    family: "gpt-pro",
    id: "openai/gpt-5.4-pro",
    knowledge: "2025-08-31",
    last_updated: "2026-03-05",
    limit: {
      context: 1050000,
      input: 922000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.4 Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-05",
    structured_output: false,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.5": {
    attachment: true,
    benchmarks: [
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 58.6,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench",
        score: 78.2,
        source: "https://www.anthropic.com/news/claude-opus-4-8"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 45.43,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 44.79,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 42.59,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 65.3,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 80.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 30.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 84.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 60.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 79.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 26.2,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 75.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 57.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 75,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 24.9,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 73.4,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "gpt",
    id: "openai/gpt-5.5",
    knowledge: "2025-12-01",
    last_updated: "2026-04-23",
    limit: {
      context: 1050000,
      input: 922000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.5",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-23",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-5.5-instant": {
    attachment: true,
    id: "openai/gpt-5.5-instant",
    knowledge: "2025-12-01",
    last_updated: "2026-05-28",
    limit: {
      context: 400000,
      input: 400000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.5 Instant",
    open_weights: false,
    reasoning: true,
    release_date: "2026-05-05",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "openai/gpt-5.5-pro": {
    attachment: true,
    family: "gpt-pro",
    id: "openai/gpt-5.5-pro",
    knowledge: "2025-12-01",
    last_updated: "2026-04-23",
    limit: {
      context: 1050000,
      input: 922000,
      output: 128000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT-5.5 Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-23",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/gpt-image-1": {
    attachment: true,
    family: "gpt-image",
    id: "openai/gpt-image-1",
    last_updated: "2025-04-24",
    limit: {
      context: 0,
      output: 0
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "image"
      ]
    },
    name: "GPT-Image-1",
    open_weights: false,
    reasoning: false,
    release_date: "2025-04-24",
    temperature: false,
    tool_call: false
  },
  "openai/gpt-image-1.5": {
    attachment: true,
    family: "gpt-image",
    id: "openai/gpt-image-1.5",
    last_updated: "2025-11-25",
    limit: {
      context: 0,
      output: 0
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text",
        "image"
      ]
    },
    name: "GPT-Image-1.5",
    open_weights: false,
    reasoning: false,
    release_date: "2025-11-25",
    temperature: false,
    tool_call: false
  },
  "openai/gpt-image-2": {
    attachment: true,
    family: "gpt-image",
    id: "openai/gpt-image-2",
    last_updated: "2026-04-21",
    limit: {
      context: 0,
      output: 0
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "image"
      ]
    },
    name: "GPT-Image-2",
    open_weights: false,
    reasoning: false,
    release_date: "2026-04-21",
    temperature: false,
    tool_call: false
  },
  "openai/gpt-oss-120b": {
    attachment: false,
    family: "gpt-oss",
    id: "openai/gpt-oss-120b",
    last_updated: "2025-08-05",
    limit: {
      context: 131072,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT OSS 120B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-08-05",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/openai/gpt-oss-120b"
      }
    ]
  },
  "openai/gpt-oss-safeguard-120b": {
    attachment: false,
    family: "gpt-oss",
    id: "openai/gpt-oss-safeguard-120b",
    last_updated: "2025-10-29",
    limit: {
      context: 131072,
      output: 32768
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GPT OSS Safeguard 120B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-10-29",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/openai/gpt-oss-safeguard-120b"
      }
    ]
  },
  "openai/o1": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 61.7,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "o",
    id: "openai/o1",
    knowledge: "2023-09",
    last_updated: "2024-12-05",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o1",
    open_weights: false,
    reasoning: true,
    release_date: "2024-12-05",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o1-pro": {
    attachment: true,
    family: "o-pro",
    id: "openai/o1-pro",
    knowledge: "2023-09",
    last_updated: "2025-03-19",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o1-pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-03-19",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o3": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 81.3,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "o",
    id: "openai/o3",
    knowledge: "2024-05",
    last_updated: "2025-04-16",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o3",
    open_weights: false,
    reasoning: true,
    release_date: "2025-04-16",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o3-deep-research": {
    attachment: true,
    family: "o",
    id: "openai/o3-deep-research",
    knowledge: "2024-05",
    last_updated: "2024-06-26",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o3-deep-research",
    open_weights: false,
    reasoning: true,
    release_date: "2024-06-26",
    temperature: false,
    tool_call: true
  },
  "openai/o3-mini": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 60.4,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "o-mini",
    id: "openai/o3-mini",
    knowledge: "2024-05",
    last_updated: "2025-01-29",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "o3-mini",
    open_weights: false,
    reasoning: true,
    release_date: "2024-12-20",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o3-pro": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 84.9,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "o-pro",
    id: "openai/o3-pro",
    knowledge: "2024-05",
    last_updated: "2025-06-10",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o3-pro",
    open_weights: false,
    reasoning: true,
    release_date: "2025-06-10",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o4-mini": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "Aider Polyglot",
        score: 72,
        source: "https://aider.chat/docs/leaderboards/"
      }
    ],
    family: "o-mini",
    id: "openai/o4-mini",
    knowledge: "2024-05",
    last_updated: "2025-04-16",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o4-mini",
    open_weights: false,
    reasoning: true,
    release_date: "2025-04-16",
    structured_output: true,
    temperature: false,
    tool_call: true
  },
  "openai/o4-mini-deep-research": {
    attachment: true,
    family: "o-mini",
    id: "openai/o4-mini-deep-research",
    knowledge: "2024-05",
    last_updated: "2024-06-26",
    limit: {
      context: 200000,
      output: 1e5
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "o4-mini-deep-research",
    open_weights: false,
    reasoning: true,
    release_date: "2024-06-26",
    temperature: false,
    tool_call: true
  },
  "openai/whisper-large-v3": {
    attachment: false,
    family: "whisper",
    id: "openai/whisper-large-v3",
    last_updated: "2024-10-01",
    limit: {
      context: 448,
      output: 4096
    },
    modalities: {
      input: [
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Whisper 3 Large",
    open_weights: true,
    reasoning: false,
    release_date: "2024-10-01",
    tool_call: false
  },
  "openai/whisper-large-v3-turbo": {
    attachment: false,
    family: "whisper",
    id: "openai/whisper-large-v3-turbo",
    last_updated: "2024-10-01",
    limit: {
      context: 448,
      output: 448
    },
    modalities: {
      input: [
        "audio"
      ],
      output: [
        "text"
      ]
    },
    name: "Whisper Large v3 Turbo",
    open_weights: true,
    reasoning: false,
    release_date: "2024-10-01",
    tool_call: false
  },
  "perplexity/sonar": {
    attachment: false,
    benchmarks: [
      {
        metric: "percent correct",
        name: "SciCode",
        score: 22.9,
        source: "https://openrouter.ai/perplexity/sonar/benchmarks"
      }
    ],
    family: "sonar",
    id: "perplexity/sonar",
    knowledge: "2025-09-01",
    last_updated: "2025-09-01",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Sonar",
    open_weights: false,
    reasoning: false,
    release_date: "2024-01-01",
    temperature: true,
    tool_call: false
  },
  "perplexity/sonar-pro": {
    attachment: true,
    benchmarks: [
      {
        metric: "percent correct",
        name: "SciCode",
        score: 22.6,
        source: "https://openrouter.ai/perplexity/sonar-pro/benchmarks"
      }
    ],
    family: "sonar-pro",
    id: "perplexity/sonar-pro",
    knowledge: "2025-09-01",
    last_updated: "2025-09-01",
    limit: {
      context: 200000,
      output: 8192
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Sonar Pro",
    open_weights: false,
    reasoning: false,
    release_date: "2024-01-01",
    temperature: true,
    tool_call: false
  },
  "perplexity/sonar-reasoning-pro": {
    attachment: true,
    family: "sonar-reasoning",
    id: "perplexity/sonar-reasoning-pro",
    knowledge: "2025-09-01",
    last_updated: "2025-09-01",
    limit: {
      context: 128000,
      output: 4096
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Sonar Reasoning Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2024-01-01",
    temperature: true,
    tool_call: false
  },
  "sarvam/sarvam-105b": {
    attachment: false,
    family: "sarvam",
    id: "sarvam/sarvam-105b",
    last_updated: "2025-09-01",
    limit: {
      context: 131072,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Sarvam 105B",
    open_weights: true,
    reasoning: true,
    release_date: "2025-09-01",
    temperature: true,
    tool_call: true
  },
  "sarvam/sarvam-30b": {
    attachment: false,
    family: "sarvam",
    id: "sarvam/sarvam-30b",
    last_updated: "2026-02-18",
    limit: {
      context: 128000,
      output: 128000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Sarvam 30B",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-18",
    temperature: true,
    tool_call: true
  },
  "stepfun/step-3.5-flash": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 31.6,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 40.4,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 27.3,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      },
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 74.4,
        source: "https://arxiv.org/abs/2602.10604"
      }
    ],
    id: "stepfun/step-3.5-flash",
    knowledge: "2025-01",
    last_updated: "2026-02-13",
    limit: {
      context: 256000,
      input: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Step 3.5 Flash",
    open_weights: true,
    reasoning: true,
    release_date: "2026-01-29",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/stepfun-ai/Step-3.5-Flash"
      }
    ]
  },
  "stepfun/step-3.5-flash-2603": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 34.6,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 38.5,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 32.6,
        source: "https://openrouter.ai/stepfun/step-3.5-flash/benchmarks"
      }
    ],
    id: "stepfun/step-3.5-flash-2603",
    knowledge: "2025-01",
    last_updated: "2026-04-02",
    limit: {
      context: 256000,
      input: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Step 3.5 Flash 2603",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-02",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/stepfun-ai/Step-3.5-Flash"
      }
    ]
  },
  "stepfun/step-3.7-flash": {
    attachment: true,
    id: "stepfun/step-3.7-flash",
    knowledge: "2026-01-01",
    last_updated: "2026-05-29",
    limit: {
      context: 256000,
      input: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Step 3.7 Flash",
    open_weights: true,
    reasoning: true,
    release_date: "2026-05-29",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/stepfun-ai/Step-3.7-Flash"
      }
    ]
  },
  "tencent/hy3-preview": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 74.4,
        source: "https://huggingface.co/tencent/Hy3-preview"
      }
    ],
    family: "Hy",
    id: "tencent/hy3-preview",
    last_updated: "2026-04-20",
    limit: {
      context: 256000,
      output: 64000
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "Hy3 preview",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-20",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/tencent/Hy3-preview"
      }
    ]
  },
  "xai/grok-4.20-0309-non-reasoning": {
    attachment: true,
    family: "grok",
    id: "xai/grok-4.20-0309-non-reasoning",
    last_updated: "2026-03-09",
    limit: {
      context: 1e6,
      output: 30000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Grok 4.20 (Non-Reasoning)",
    open_weights: false,
    reasoning: false,
    release_date: "2026-03-09",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "xai/grok-4.20-0309-reasoning": {
    attachment: true,
    family: "grok",
    id: "xai/grok-4.20-0309-reasoning",
    last_updated: "2026-03-09",
    limit: {
      context: 1e6,
      output: 30000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Grok 4.20 (Reasoning)",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-09",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "xai/grok-4.3": {
    attachment: true,
    family: "grok",
    id: "xai/grok-4.3",
    last_updated: "2026-04-17",
    limit: {
      context: 1e6,
      output: 30000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Grok 4.3",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-17",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "xai/grok-build-0.1": {
    attachment: true,
    family: "grok-build",
    id: "xai/grok-build-0.1",
    last_updated: "2026-04-16",
    limit: {
      context: 256000,
      output: 256000
    },
    modalities: {
      input: [
        "text",
        "image"
      ],
      output: [
        "text"
      ]
    },
    name: "Grok Build 0.1",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-16",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "xiaomi/mimo-v2-flash": {
    attachment: false,
    family: "mimo",
    id: "xiaomi/mimo-v2-flash",
    knowledge: "2024-12-01",
    last_updated: "2026-02-04",
    limit: {
      context: 262144,
      output: 65536
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2-Flash",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-16",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/XiaomiMiMo/MiMo-V2-Flash"
      }
    ]
  },
  "xiaomi/mimo-v2-omni": {
    attachment: true,
    family: "mimo",
    id: "xiaomi/mimo-v2-omni",
    knowledge: "2024-12",
    last_updated: "2026-03-18",
    limit: {
      context: 262144,
      output: 131072
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2-Omni",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-18",
    temperature: true,
    tool_call: true
  },
  "xiaomi/mimo-v2-pro": {
    attachment: false,
    family: "mimo",
    id: "xiaomi/mimo-v2-pro",
    knowledge: "2024-12",
    last_updated: "2026-03-18",
    limit: {
      context: 1048576,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2-Pro",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-18",
    temperature: true,
    tool_call: true
  },
  "xiaomi/mimo-v2.5": {
    attachment: true,
    family: "mimo",
    id: "xiaomi/mimo-v2.5",
    knowledge: "2024-12",
    last_updated: "2026-04-22",
    limit: {
      context: 1048576,
      output: 131072
    },
    modalities: {
      input: [
        "text",
        "image",
        "audio",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2.5",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-22",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/XiaomiMiMo/MiMo-V2.5"
      }
    ]
  },
  "xiaomi/mimo-v2.5-pro": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 78.9,
        source: "https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro"
      }
    ],
    family: "mimo",
    id: "xiaomi/mimo-v2.5-pro",
    knowledge: "2024-12",
    last_updated: "2026-04-22",
    limit: {
      context: 1048576,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2.5-Pro",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-22",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro"
      }
    ]
  },
  "xiaomi/mimo-v2.5-pro-ultraspeed": {
    attachment: false,
    family: "mimo",
    id: "xiaomi/mimo-v2.5-pro-ultraspeed",
    knowledge: "2024-12",
    last_updated: "2026-06-09",
    limit: {
      context: 1048576,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "MiMo-V2.5-Pro-UltraSpeed",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-08",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro-FP4-DFlash"
      }
    ]
  },
  "zhipuai/glm-4.5": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 26.3,
        source: "https://openrouter.ai/z-ai/glm-4.5/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 34.8,
        source: "https://openrouter.ai/z-ai/glm-4.5/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 22,
        source: "https://openrouter.ai/z-ai/glm-4.5/benchmarks"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-4.5",
    knowledge: "2025-04",
    last_updated: "2025-07-28",
    limit: {
      context: 131072,
      output: 98304
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.5",
    open_weights: true,
    reasoning: true,
    release_date: "2025-07-28",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.5"
      }
    ]
  },
  "zhipuai/glm-4.5-air": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 23.8,
        source: "https://openrouter.ai/z-ai/glm-4.5-air/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 30.6,
        source: "https://openrouter.ai/z-ai/glm-4.5-air/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 20.5,
        source: "https://openrouter.ai/z-ai/glm-4.5-air/benchmarks"
      }
    ],
    family: "glm-air",
    id: "zhipuai/glm-4.5-air",
    knowledge: "2025-04",
    last_updated: "2025-07-28",
    limit: {
      context: 131072,
      output: 98304
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.5-Air",
    open_weights: true,
    reasoning: true,
    release_date: "2025-07-28",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.5-Air"
      }
    ]
  },
  "zhipuai/glm-4.5-flash": {
    attachment: false,
    family: "glm-flash",
    id: "zhipuai/glm-4.5-flash",
    knowledge: "2025-04",
    last_updated: "2025-07-28",
    limit: {
      context: 131072,
      output: 98304
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.5-Flash",
    open_weights: false,
    reasoning: true,
    release_date: "2025-07-28",
    temperature: true,
    tool_call: true
  },
  "zhipuai/glm-4.5v": {
    attachment: true,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 10.9,
        source: "https://openrouter.ai/z-ai/glm-4.5v/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 22.1,
        source: "https://openrouter.ai/z-ai/glm-4.5v/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 5.3,
        source: "https://openrouter.ai/z-ai/glm-4.5v/benchmarks"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-4.5v",
    knowledge: "2025-04",
    last_updated: "2025-08-11",
    limit: {
      context: 64000,
      output: 16384
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.5V",
    open_weights: true,
    reasoning: true,
    release_date: "2025-08-11",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.5V"
      }
    ]
  },
  "zhipuai/glm-4.6": {
    attachment: false,
    benchmarks: [
      {
        metric: "index",
        name: "Artificial Analysis Coding Index",
        score: 29.5,
        source: "https://openrouter.ai/z-ai/glm-4.6/benchmarks"
      },
      {
        metric: "percent correct",
        name: "SciCode",
        score: 38.4,
        source: "https://openrouter.ai/z-ai/glm-4.6/benchmarks"
      },
      {
        metric: "success rate",
        name: "Terminal-Bench Hard",
        score: 25,
        source: "https://openrouter.ai/z-ai/glm-4.6/benchmarks"
      },
      {
        metric: "resolve rate",
        name: "SWE-Bench Pro",
        score: 9.67,
        source: "https://labs.scale.com/leaderboard/swe_bench_pro_public"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-4.6",
    knowledge: "2025-04",
    last_updated: "2025-09-30",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.6",
    open_weights: true,
    reasoning: true,
    release_date: "2025-09-30",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.6"
      }
    ]
  },
  "zhipuai/glm-4.6v": {
    attachment: true,
    family: "glm",
    id: "zhipuai/glm-4.6v",
    knowledge: "2025-04",
    last_updated: "2025-12-08",
    limit: {
      context: 128000,
      output: 32768
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.6V",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-08",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.6V"
      }
    ]
  },
  "zhipuai/glm-4.7": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 73.8,
        source: "https://huggingface.co/zai-org/GLM-4.7"
      },
      {
        metric: "score",
        name: "Terminal Bench 2.0",
        score: 33.4,
        source: "https://huggingface.co/zai-org/GLM-4.7"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-4.7",
    knowledge: "2025-04",
    last_updated: "2025-12-22",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.7",
    open_weights: true,
    reasoning: true,
    release_date: "2025-12-22",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.7"
      }
    ]
  },
  "zhipuai/glm-4.7-flash": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 59.2,
        source: "https://huggingface.co/zai-org/GLM-4.7-Flash"
      }
    ],
    family: "glm-flash",
    id: "zhipuai/glm-4.7-flash",
    knowledge: "2025-04",
    last_updated: "2026-01-19",
    limit: {
      context: 200000,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.7-Flash",
    open_weights: true,
    reasoning: true,
    release_date: "2026-01-19",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.7-Flash"
      }
    ]
  },
  "zhipuai/glm-4.7-flashx": {
    attachment: false,
    family: "glm-flash",
    id: "zhipuai/glm-4.7-flashx",
    knowledge: "2025-04",
    last_updated: "2026-01-19",
    limit: {
      context: 200000,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-4.7-FlashX",
    open_weights: true,
    reasoning: true,
    release_date: "2026-01-19",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-4.7-Flash"
      }
    ]
  },
  "zhipuai/glm-5": {
    attachment: false,
    benchmarks: [
      {
        metric: "resolved",
        name: "SWE-Bench Verified",
        score: 72.8,
        source: "https://www.swebench.com/"
      },
      {
        metric: "score",
        name: "SWE-Atlas Codebase QnA",
        score: 20.5,
        source: "https://labs.scale.com/leaderboard/sweatlas-qna"
      },
      {
        metric: "score",
        name: "SWE-Atlas Refactoring",
        score: 24.24,
        source: "https://labs.scale.com/leaderboard/sweatlas-refactoring"
      },
      {
        metric: "score",
        name: "SWE-Atlas Test Writing",
        score: 28.74,
        source: "https://labs.scale.com/leaderboard/sweatlas-tw"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-5",
    last_updated: "2026-02-12",
    limit: {
      context: 204800,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-5",
    open_weights: true,
    reasoning: true,
    release_date: "2026-02-12",
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-5"
      }
    ]
  },
  "zhipuai/glm-5-turbo": {
    attachment: false,
    family: "glm",
    id: "zhipuai/glm-5-turbo",
    last_updated: "2026-03-16",
    limit: {
      context: 200000,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-5-Turbo",
    open_weights: false,
    reasoning: true,
    release_date: "2026-03-16",
    structured_output: true,
    temperature: true,
    tool_call: true
  },
  "zhipuai/glm-5.1": {
    attachment: false,
    benchmarks: [
      {
        metric: "average pass@1",
        name: "Artificial Analysis Coding Agent Index",
        score: 52.7,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Atlas Codebase QnA",
        score: 73.2,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "SWE-Bench Pro",
        score: 19.8,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      },
      {
        metric: "pass@1",
        name: "Terminal-Bench",
        score: 65.1,
        source: "https://artificialanalysis.ai/agents/coding-agents"
      }
    ],
    family: "glm",
    id: "zhipuai/glm-5.1",
    last_updated: "2026-04-07",
    limit: {
      context: 200000,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-5.1",
    open_weights: true,
    reasoning: true,
    release_date: "2026-04-07",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-5.1"
      }
    ]
  },
  "zhipuai/glm-5.2": {
    attachment: false,
    family: "glm",
    id: "zhipuai/glm-5.2",
    last_updated: "2026-06-13",
    limit: {
      context: 1e6,
      output: 131072
    },
    modalities: {
      input: [
        "text"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-5.2",
    open_weights: true,
    reasoning: true,
    release_date: "2026-06-13",
    structured_output: true,
    temperature: true,
    tool_call: true,
    weights: [
      {
        label: "Hugging Face",
        url: "https://huggingface.co/zai-org/GLM-5.2"
      }
    ]
  },
  "zhipuai/glm-5v-turbo": {
    attachment: true,
    family: "glm",
    id: "zhipuai/glm-5v-turbo",
    last_updated: "2026-04-01",
    limit: {
      context: 200000,
      output: 131072
    },
    modalities: {
      input: [
        "text",
        "image",
        "video"
      ],
      output: [
        "text"
      ]
    },
    name: "GLM-5V-Turbo",
    open_weights: false,
    reasoning: true,
    release_date: "2026-04-01",
    temperature: true,
    tool_call: true
  }
};
// packages/ai/src/catalogue/generated/labs.generated.ts
var AI_LABS = {};
// packages/ai/src/catalogue/generated/catalogue.generated.ts
var defaultAiCatalogue = new AiCatalogue({
  providers: AI_PROVIDERS,
  models: AI_MODELS,
  labs: AI_LABS
});
// apps/playground-app-ai/src/verify/shared/capabilities.ts
function resolveModelCapabilities(modelId, defaults, catalogue = defaultAiCatalogue) {
  const model = catalogue.getModel(modelId);
  if (model) {
    const inputModalities2 = [...model.modalities.input];
    return {
      modelId,
      source: "catalogue",
      inputModalities: inputModalities2,
      supportsImage: inputModalities2.includes("image"),
      supportsReasoning: Boolean(model.reasoning),
      supportsToolCall: Boolean(model.tool_call)
    };
  }
  const inputModalities = defaults?.inputModalities ?? ["text"];
  return {
    modelId,
    source: "defaults",
    inputModalities,
    supportsImage: inputModalities.includes("image"),
    supportsReasoning: Boolean(defaults?.reasoning),
    supportsToolCall: Boolean(defaults?.toolCall)
  };
}
function formatModelCapabilities(capabilities) {
  return `input=[${capabilities.inputModalities.join(",")}] supportsImage=${capabilities.supportsImage} supportsReasoning=${capabilities.supportsReasoning} supportsToolCall=${capabilities.supportsToolCall} (source=${capabilities.source})`;
}
// apps/playground-app-ai/src/verify/shared/scenarios.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function runChatStreamScenario(options) {
  const request = {
    model: options.model,
    messages: options.messages,
    ...options.settings ? { settings: options.settings } : {}
  };
  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);
  const summary = createEmptyChatStreamSummary();
  try {
    for await (const chunk of options.service.streamChat(request)) {
      applyChunkToSummary(summary, chunk, options.collectReasoning);
      options.logger.log(formatChunk(chunk));
    }
    logStreamSummary(options.logger, summary);
    const passed = summary.fullText.trim().length > 0;
    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `text=${summary.fullText.length} chars; reasoning=${summary.fullReasoning.length} chars; finish=${summary.finishCount}; empty=${summary.emptyChunkCount}`
    };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);
    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message
    };
  }
}
async function runVisionScenario(options) {
  const prompt = options.prompt ?? "What is the dominant color of this image? Answer with a single word.";
  const request = {
    model: options.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", data: options.image.data, mediaType: options.image.mediaType },
          { type: "text", text: prompt }
        ]
      }
    ]
  };
  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);
  try {
    const response = await options.service.generateChat(request);
    const text = extractText(response.message.content);
    options.logger.log(`  Response: ${text}`);
    const passed = text.trim().length > 0;
    let detail = `text=${text.length} chars`;
    if (options.expected) {
      const found = text.toLowerCase().includes(options.expected.toLowerCase());
      options.logger.log(`  Expected keyword '${options.expected}': ${found ? "found" : "NOT found"}`);
      detail += `; expected=${found ? "found" : "missing"}`;
    }
    return { label: options.label, model: options.model, passed, detail };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);
    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message
    };
  }
}
async function runEmbeddingScenario(options) {
  const request = {
    model: options.model,
    input: options.input
  };
  options.logger.log("");
  options.logger.log(`----- ${options.label} [${options.model}] -----`);
  logRequest(options.logger, request);
  try {
    const response = await options.service.generateEmbedding(request);
    const count = response.embeddings.length;
    const dimensions = response.embeddings[0]?.embedding.length ?? 0;
    options.logger.log(`  Embeddings: ${count}; dimensions: ${dimensions}`);
    if (response.usage) {
      options.logger.log(`  Usage: input=${response.usage.inputTokens}, total=${response.usage.totalTokens}`);
    }
    const passed = count > 0 && dimensions > 0;
    return {
      label: options.label,
      model: options.model,
      passed,
      detail: `embeddings=${count}; dims=${dimensions}`
    };
  } catch (error) {
    const message = errorMessage(error);
    options.logger.log(`  ERROR: ${message}`);
    return {
      label: options.label,
      model: options.model,
      passed: false,
      detail: "error",
      error: message
    };
  }
}
async function verifyProvider(config) {
  const logger = config.logger;
  const image = config.image ?? createDefaultImagePart();
  logger.log(`========== Provider: ${config.providerName} ==========`);
  logger.log(`Chat models: ${config.chatModels.join(", ") || "(none)"}`);
  if (config.supportsEmbedding && config.embedModel) {
    logger.log(`Embedding model: ${config.embedModel}`);
  } else {
    logger.log("Embedding model: (none)");
  }
  const results = [];
  for (const chatModel of config.chatModels) {
    const capabilities = resolveModelCapabilities(chatModel, config.defaultModelCapabilities);
    logger.log("");
    logger.log(`  Capabilities [${chatModel}]: ${formatModelCapabilities(capabilities)}`);
    results.push(await runChatStreamScenario({
      service: config.service,
      model: chatModel,
      logger,
      label: "CHAT STREAM (no reasoning)",
      messages: [
        {
          role: "user",
          content: "What is the capital of Portugal? Answer in one word."
        }
      ],
      settings: { reasoningEffort: "none" }
    }));
    results.push(await runChatStreamScenario({
      service: config.service,
      model: chatModel,
      logger,
      label: "CHAT STREAM (with reasoning)",
      messages: [
        {
          role: "user",
          content: "A train leaves station A at 60 km/h and another leaves station B at 80 km/h. The stations are 280 km apart. How long until they meet? Explain step by step."
        }
      ],
      settings: { reasoningEffort: config.reasoningEffort ?? "high" },
      collectReasoning: true
    }));
    if (!config.skipVision && capabilities.supportsImage) {
      results.push(await runVisionScenario({
        service: config.service,
        model: chatModel,
        image,
        prompt: config.visionPrompt,
        expected: config.visionExpected ?? "red",
        logger,
        label: "VISION (image+text parts)"
      }));
    } else if (!config.skipVision) {
      logger.log(`  VISION: skipped (model does not accept image input per ${capabilities.source})`);
    }
  }
  if (config.supportsEmbedding && config.embedModel) {
    results.push(await runEmbeddingScenario({
      service: config.service,
      model: config.embedModel,
      input: "The quick brown fox jumps over the lazy dog",
      logger,
      label: "EMBEDDING"
    }));
  }
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  logger.log("");
  logger.log(`Provider '${config.providerName}' summary: ${results.length} scenarios, ${passed} passed, ${failed} failed.`);
  for (const result of results) {
    logger.log(`  [${result.passed ? "PASS" : "FAIL"}] ${result.label} [${result.model}] - ${result.detail}${result.error ? ` :: ${result.error}` : ""}`);
  }
  return {
    provider: config.provider,
    providerName: config.providerName,
    total: results.length,
    passed,
    failed,
    results,
    logPath: logger.logPath
  };
}
// apps/playground-app-ai/src/index.ts
var providers = createAiAppProvidersFromEnv();
if (providers.length === 0) {
  console.log("No AI providers configured. Set OLLAMA_API_KEY and/or DEEPSEEK_API_KEY in .env, or set AI_APP_PROVIDER to a valid id.");
  process.exit(0);
}
var failedProviders = 0;
for (const config of providers) {
  const app = await createPlaygroundAiApp({
    clients: [config.client],
    defaults: {
      chatProvider: config.client.id,
      chatModel: config.chatModel,
      embeddingProvider: config.client.id,
      embeddingModel: config.embeddingModel
    }
  });
  await app.start();
  const image = config.imagePath ? await createLocalImagePart(config.imagePath).catch(() => {
    return;
  }) : undefined;
  const logger2 = createAppAiLogger({
    provider: config.client.id,
    filePrefix: `verification-${config.client.id}`
  });
  try {
    const result = await verifyProvider({
      provider: config.client.id,
      providerName: config.client.name,
      service: app.get(AiGenerationService),
      chatModels: config.chatModels,
      embedModel: config.embeddingModel,
      supportsEmbedding: config.supportsEmbedding,
      defaultModelCapabilities: config.defaultModelCapabilities,
      image,
      visionPrompt: config.visionPrompt,
      visionExpected: config.visionExpected,
      logger: logger2
    });
    if (result.failed > 0) {
      failedProviders += 1;
    }
  } finally {
    await logger2.close();
    await app.stop();
  }
}
if (failedProviders > 0) {
  process.exit(1);
}

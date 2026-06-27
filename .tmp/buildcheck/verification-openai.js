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
          mediaType: part.mimeType
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
// apps/playground-app-ai/src/verify/shared/logger.ts
import { mkdirSync } from "fs";
import path2 from "path";
function createTimestamp() {
  const date = new Date;
  const pad = (value) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${date.getMilliseconds()}`;
}
function createAppAiLogger(options) {
  const baseDir = options.logDir ?? path2.resolve(import.meta.dirname, "../../../../../data/logs/app-ai");
  const logDir = path2.join(baseDir, options.provider);
  mkdirSync(logDir, { recursive: true });
  const logPath = path2.join(logDir, `${options.filePrefix}-${createTimestamp()}.log`);
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
      return { type: "image", mimeType: part.mimeType, bytes: part.data.length };
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
// apps/playground-app-ai/src/verify/shared/args.ts
function splitCsv(value) {
  if (!value) {
    return;
  }
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}
function parseVerifyArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0;index < argv.length; index += 1) {
    const current = argv[index];
    if (!current || current === "--") {
      continue;
    }
    switch (current) {
      case "--list":
      case "-l":
        result.list = true;
        break;
      case "--models":
      case "--model":
      case "-m":
        result.models = splitCsv(argv[index + 1]);
        index += 1;
        break;
      case "--embed-model":
        result.embedModel = argv[index + 1];
        index += 1;
        break;
      case "--vision-model":
        result.visionModel = argv[index + 1];
        index += 1;
        break;
      case "--base-url":
      case "-b":
        result.baseUrl = argv[index + 1];
        index += 1;
        break;
      case "--api-key":
      case "-k":
        result.apiKey = argv[index + 1];
        index += 1;
        break;
      case "--image":
        result.image = argv[index + 1];
        index += 1;
        break;
      case "--reasoning-effort": {
        const value = argv[index + 1];
        if (value === "none" || value === "low" || value === "medium" || value === "high") {
          result.reasoningEffort = value;
        }
        index += 1;
        break;
      }
      case "--skip-vision":
        result.skipVision = true;
        break;
      case "--skip-embedding":
        result.skipEmbedding = true;
        break;
    }
  }
  return result;
}
// apps/playground-app-ai/src/verify/shared/images.ts
import { deflateSync } from "zlib";
import path3 from "path";
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
function createImagePartFromBase64(base64, mimeType = "image/png") {
  return { type: "image", data: base64, mimeType };
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
  const extension = path3.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
  return { type: "image", data: buffer.toString("base64"), mimeType };
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
          { type: "image", data: options.image.data, mimeType: options.image.mimeType },
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
  if (config.visionModel) {
    logger.log(`Vision model: ${config.visionModel}`);
  } else {
    logger.log("Vision model: (none)");
  }
  const results = [];
  for (const chatModel of config.chatModels) {
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
    if (config.visionModel) {
      results.push(await runVisionScenario({
        service: config.service,
        model: config.visionModel,
        image,
        prompt: config.visionPrompt,
        expected: config.visionExpected ?? "red",
        logger,
        label: `VISION (${config.visionModel})`
      }));
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
async function runProviderVerification(options) {
  const app = await createPlaygroundAiApp({
    clients: [options.client],
    defaults: {
      chatProvider: options.client.id,
      chatModel: options.chatModels[0],
      embeddingProvider: options.client.id,
      embeddingModel: options.embedModel
    }
  });
  await app.start();
  const service = app.get(AiGenerationService);
  const logger = createAppAiLogger({
    provider: options.provider,
    filePrefix: options.filePrefix ?? `verification-${options.provider}`
  });
  try {
    const result = await verifyProvider({
      provider: options.provider,
      providerName: options.providerName,
      service,
      chatModels: options.chatModels,
      embedModel: options.embedModel,
      supportsEmbedding: options.supportsEmbedding,
      visionModel: options.visionModel,
      reasoningEffort: options.reasoningEffort,
      image: options.image,
      logger
    });
    if (result.failed > 0) {
      process.exitCode = 1;
    }
    return result;
  } finally {
    await logger.close();
    await app.stop();
  }
}
// apps/playground-app-ai/src/verify/verification-openai.ts
var PROVIDER = "openai";
var args2 = parseVerifyArgs();
if (args2.list) {
  console.log("OpenAI verification (via OpenAI-compatible client)");
  console.log("  bun run verify:openai -- --models gpt-4o-mini --embed-model text-embedding-3-small");
  console.log("Env: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_CHAT_MODELS, OPENAI_CHAT_MODEL, OPENAI_EMBED_MODEL, OPENAI_VISION_MODEL");
  process.exit(0);
}
var apiKey = (args2.apiKey ?? process.env.OPENAI_API_KEY)?.trim();
if (!apiKey) {
  console.error("OPENAI_API_KEY is not set. Set it in .env or pass --api-key.");
  process.exit(1);
}
var baseURL = args2.baseUrl ?? process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1";
var chatModels = args2.models ?? splitCsv(process.env.OPENAI_CHAT_MODELS) ?? [process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"];
var embedModel = args2.embedModel ?? process.env.OPENAI_EMBED_MODEL?.trim() ?? "text-embedding-3-small";
var visionModel = args2.skipVision ? undefined : args2.visionModel ?? process.env.OPENAI_VISION_MODEL?.trim() ?? chatModels[0];
if (chatModels.length === 0) {
  console.error("No chat models configured for OpenAI. Use --models or OPENAI_CHAT_MODELS.");
  process.exit(1);
}
var image = args2.image ? await createLocalImagePart(args2.image) : undefined;
var client = new OpenAICompatibleClient({
  id: PROVIDER,
  name: "OpenAI",
  baseURL,
  apiKey
});
await runProviderVerification({
  provider: PROVIDER,
  providerName: "OpenAI",
  client,
  chatModels,
  embedModel,
  supportsEmbedding: !args2.skipEmbedding,
  visionModel,
  reasoningEffort: args2.reasoningEffort,
  image
});

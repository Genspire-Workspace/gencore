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

// packages/ai/src/domain/messages/ai-content-part.ts
function isAiContentPartType(value) {
  return value === "text" || value === "image" || value === "tool_call" || value === "tool_result" || value === "thinking" || value === "file";
}
// packages/ai/src/domain/messages/ai-message-content.ts
function createTextAiMessageContent(text) {
  return [
    {
      type: "text",
      text
    }
  ];
}
function normalizeAiMessageContent(content) {
  if (typeof content === "string") {
    return createTextAiMessageContent(content);
  }
  return content.map((part) => ({ ...part }));
}
// packages/ai/src/domain/models/ai-api-key.ts
function resolveAiApiKey(keys, input) {
  if (input.apiKey) {
    return {
      id: "__inline__",
      name: "Inline API Key",
      value: input.apiKey,
      provider: input.provider,
      model: input.model,
      userId: input.userId,
      source: "task",
      enabled: true
    };
  }
  if (!keys || keys.length === 0) {
    return;
  }
  if (input.apiKeyId) {
    return keys.find((key) => key.id === input.apiKeyId && key.enabled !== false);
  }
  let bestMatch;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const key of keys) {
    if (key.enabled === false) {
      continue;
    }
    if (key.provider && key.provider !== input.provider) {
      continue;
    }
    if (key.model && key.model !== input.model) {
      continue;
    }
    if (key.userId && key.userId !== input.userId) {
      continue;
    }
    const score = getAiApiKeyScore(key);
    if (score > bestScore) {
      bestMatch = key;
      bestScore = score;
    }
  }
  return bestMatch;
}
function resolveAiApiKeyValue(keys, input) {
  const key = resolveAiApiKey(keys, input);
  if (!key) {
    return;
  }
  if (key.value) {
    return key.value;
  }
  if (key.env) {
    return process.env[key.env];
  }
  return;
}
function getAiApiKeyScore(key) {
  let score = 0;
  if (key.provider) {
    score += 10;
  }
  if (key.model) {
    score += 20;
  }
  if (key.userId) {
    score += 40;
  }
  return score;
}
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

// packages/ai/src/domain/tools/define-ai-tool.ts
function defineAiTool(tool) {
  const name = tool.name.trim();
  if (!name) {
    throw new AiError("AI tool name is required.");
  }
  if (!tool.description?.trim()) {
    throw new AiError(`AI tool '${name}' requires a description.`);
  }
  return {
    ...tool,
    name,
    description: tool.description.trim()
  };
}
// packages/ai/src/domain/prompts/define-ai-prompt.ts
function normalizeVariable(variable, promptId) {
  const name = variable.name.trim();
  if (!name) {
    throw new AiError(`AI prompt '${promptId}' has a variable with no name.`);
  }
  return {
    ...variable,
    name,
    description: variable.description?.trim()
  };
}
function defineAiPrompt(prompt) {
  const id = prompt.id.trim();
  if (!id) {
    throw new AiError("AI prompt id is required.");
  }
  const variables = prompt.variables?.map((variable) => normalizeVariable(variable, id));
  const variableNames = new Set;
  for (const variable of variables ?? []) {
    if (variableNames.has(variable.name)) {
      throw new AiError(`AI prompt '${id}' has a duplicate variable '${variable.name}'.`);
    }
    variableNames.add(variable.name);
  }
  return {
    ...prompt,
    id,
    name: prompt.name?.trim(),
    description: prompt.description?.trim(),
    argumentHint: prompt.argumentHint?.trim(),
    variables
  };
}
// packages/ai/src/application/skills/ai-skill-validator.ts
var MAX_NAME_LENGTH = 64;
var MAX_DESCRIPTION_LENGTH = 1024;
var NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function createIssue(code, strict, message) {
  return {
    code,
    severity: strict ? "error" : "warning",
    message
  };
}
function validateAiSkillSummary(summary, options) {
  const strict = options?.strict ?? false;
  const issues = [];
  const name = summary.name?.trim() ?? "";
  const description = summary.description?.trim() ?? "";
  if (!name) {
    issues.push({
      code: "skill_name_required",
      severity: "error",
      message: "AI skill name is required."
    });
  }
  if (!description) {
    issues.push({
      code: "skill_description_required",
      severity: "error",
      message: "AI skill description is required."
    });
  }
  if (name && name.length > MAX_NAME_LENGTH) {
    issues.push(createIssue("skill_name_too_long", strict, `AI skill name must be at most ${MAX_NAME_LENGTH} characters.`));
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    issues.push(createIssue("skill_description_too_long", strict, `AI skill description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`));
  }
  if (name) {
    if (name.startsWith("-")) {
      issues.push(createIssue("skill_name_leading_hyphen", strict, "AI skill name cannot start with a hyphen."));
    }
    if (name.endsWith("-")) {
      issues.push(createIssue("skill_name_trailing_hyphen", strict, "AI skill name cannot end with a hyphen."));
    }
    if (name.includes("--")) {
      issues.push(createIssue("skill_name_consecutive_hyphens", strict, "AI skill name cannot contain consecutive hyphens."));
    }
    if (!NAME_PATTERN.test(name)) {
      issues.push(createIssue("skill_name_invalid_format", strict, "AI skill name must use lowercase letters, numbers, and single hyphens only."));
    }
  }
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

// packages/ai/src/domain/skills/define-ai-skill.ts
function normalizeSource(source) {
  if (!source) {
    return;
  }
  return {
    ...source,
    path: source.path?.trim(),
    packageName: source.packageName?.trim()
  };
}
function normalizeFile(file) {
  return {
    ...file,
    path: file.path.trim(),
    metadata: file.metadata ? { ...file.metadata } : undefined
  };
}
function defineAiSkill(skill) {
  const normalizedAllowedTools = skill.allowedTools?.map((tool) => tool.trim()).filter((tool) => tool.length > 0);
  const normalizedSkill = {
    ...skill,
    name: skill.name.trim(),
    description: skill.description?.trim() ?? "",
    license: skill.license?.trim(),
    compatibility: skill.compatibility?.trim(),
    instructions: skill.instructions?.trim(),
    allowedTools: normalizedAllowedTools,
    source: normalizeSource(skill.source),
    files: skill.files?.map((file) => normalizeFile(file))
  };
  const validation = validateAiSkillSummary(normalizedSkill, { strict: true });
  if (!validation.valid) {
    throw new AiError(validation.issues.map((issue) => issue.message).join(" "));
  }
  return normalizedSkill;
}
export {
  resolveAiApiKeyValue,
  resolveAiApiKey,
  normalizeAiMessageContent,
  isAiContentPartType,
  defineAiTool,
  defineAiSkill,
  defineAiPrompt,
  createTextAiMessageContent
};

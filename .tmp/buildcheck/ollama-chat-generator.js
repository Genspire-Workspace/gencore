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
export {
  OllamaChatGenerator
};

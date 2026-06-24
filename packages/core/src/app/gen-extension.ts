export interface GenExtension {
  name: string;
  dependsOn?: readonly string[];
  register?(app: import("./gen-app.js").GenApp): void | Promise<void>;
  start?(app: import("./gen-app.js").GenApp): void | Promise<void>;
  stop?(app: import("./gen-app.js").GenApp): void | Promise<void>;
}

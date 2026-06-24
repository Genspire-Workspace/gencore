import { createPlaygroundApp } from "./playground-app.js";

const port = 3000;
const app = await createPlaygroundApp({
  port,
});

await app.start();

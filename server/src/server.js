import http from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { createSocketServer } from "./socket/index.js";

const server = http.createServer(app);
const io = createSocketServer(server);

server.listen(env.port, () => {
  console.log(`Server listening on port ${env.port} in ${env.nodeEnv} mode`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server.`);

  io.close();

  server.close((error) => {
    if (error) {
      console.error("Error while shutting down the server.", error);
      process.exit(1);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection.", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception.", error);
  shutdown("uncaughtException");
});

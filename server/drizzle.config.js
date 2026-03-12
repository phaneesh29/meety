import { env } from "./src/config/env.js";

export default {
  schema: "./src/db/schema/**/*.{js,mjs}",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.databaseUrl,
  },
  strict: true,
  verbose: true,
};

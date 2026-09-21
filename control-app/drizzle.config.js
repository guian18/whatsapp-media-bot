import { defineConfig } from "drizzle-kit";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}
var drizzle_config_default = defineConfig({
  schema: "./drizzle/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString
  }
});
export {
  drizzle_config_default as default
};

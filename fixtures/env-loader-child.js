import "../src/env.js";

if (process.env.TEST_ENV_LOAD !== "loaded-from-file") {
  console.error("The .env loader did not populate TEST_ENV_LOAD.");
  process.exit(1);
}

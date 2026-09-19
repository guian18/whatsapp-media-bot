import "../src/env.js";

if (process.env.TEST_ENV_LOAD !== "loaded-from-file") {
  console.error("The .env loader did not populate TEST_ENV_LOAD.");
  process.exit(1);
}

if (process.env.TEST_ENV_MIGRATION === "1" && process.env.AI_MODEL !== "openai/gpt-oss-20b") {
  console.error("The .env loader did not migrate the deprecated Groq model.");
  process.exit(1);
}

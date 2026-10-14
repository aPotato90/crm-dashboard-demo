import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Security-rules tests. They need the Firestore emulator: run them with
// `npm run test:rules`, which starts the emulator around this config.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});

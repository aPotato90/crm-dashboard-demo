import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Date math in tests (months, weeks, days) must not depend on the machine.
process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

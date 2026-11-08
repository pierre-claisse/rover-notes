import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/rover-notes/",
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    exclude: ["tests/browser-roundtrip.ts", "node_modules/**", "dist/**"],
    testTimeout: 30_000,
  },
});

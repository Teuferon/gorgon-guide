import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" makes the build work from any static host and from a sub-folder.
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 2100 }, // recipes.json is one 1.9 MB chunk, loaded lazily
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

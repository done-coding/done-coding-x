/// <reference types="vitest" />
import type { BuildOptions } from "vite";
import { defineConfig } from "vite";
import path from "node:path";
import dts from "vite-plugin-dts";

const isPro = process.env.NODE_ENV === "production";

const build = {
  minify: isPro,
  emptyOutDir: true,
  rollupOptions: {
    external: [],
    input: ["src/index.ts"],
    output: [
      {
        format: "es",
        entryFileNames: "[name].mjs",
        // preserveModules: true,
        dir: "./es",
        // preserveModulesRoot: "src",
      },
      {
        format: "cjs",
        exports: "named",
        entryFileNames: "[name].cjs",
        // preserveModules: true,
        dir: "./lib",
        // preserveModulesRoot: "src",
      },
    ],
  },
  lib: {
    entry: "./src/index.ts",
  },
} satisfies BuildOptions;

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "istanbul", // or 'v8'
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts?(x)"],
    },
  },
  plugins: [
    dts({
      include: [
        "./src/*.ts",
        "./src/*.d.ts",
        "./src/**/*.ts",
        "./src/**/*.tsx",
        "./src/**/*.d.ts",
        "./src/**/*.json",
      ],
      exclude: ["**/__tests__/**"],
      outDir: "./types",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  json: {
    namedExports: false,
    stringify: false,
  },
  build,
});

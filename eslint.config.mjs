import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Existing data loaders intentionally update state after asynchronous effects.
      // Phase 2 replaces them with server-fetched admin data and shared query primitives.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".playwright-mcp/**",
    ".vercel/**",
    "_qa/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

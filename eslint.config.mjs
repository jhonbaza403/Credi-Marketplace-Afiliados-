import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "dist/**",
    "build/**",
    ".vercel/**",
    "*.log",
    "**/*.log",
    ".env",
    ".env.*",
    "!.env.example",
    ".cache/**",
    ".turbo/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
  ]),
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
      "react/jsx-no-target-blank": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unreachable": "error",
      "no-async-promise-executor": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["*.config.js", "*.config.mjs", "*.config.cjs", "*.config.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "tests/**/*.ts",
      "tests/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ],
    rules: {
      "no-console": "off",
    },
  },
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs["core-web-vitals"].rules,
};

export default defineConfig([
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
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextRules,
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
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

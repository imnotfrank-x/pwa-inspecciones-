import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**", "coverage/**", "test-results/**", "playwright-report/**"] },
  {
    files: ["scripts/**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly" } }
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/unit/**/*.ts", "tests/fixtures/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] }
  },
  // La resolución heredada carga módulos CommonJS de forma diferida; se conserva su contrato.
  { files: ["src/lib/sync/queue.ts"], rules: { "@typescript-eslint/no-require-imports": "off" } }
);

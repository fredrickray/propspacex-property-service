// eslint.config.js
import { Linter } from "eslint";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

/** @type {Linter.Config[]} */
export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error", // Run Prettier as an ESLint rule
    },
    settings: {
      ...prettierConfig,
    },
  },
];

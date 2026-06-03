import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      ".agents/**",
      ".next/**",
      "coverage/**",
      "data/favorites.json",
      "docs/**",
      "node_modules/**",
      "out/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  nextPlugin.configs["core-web-vitals"],
  prettierConfig,
];

export default eslintConfig;

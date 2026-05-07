import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // minified vendor files in public
    "public/**/*.min.*",
    "public/**/*.worker.*",
    // e2e tests — handled by playwright, not next lint
    "e2e/**",
    "playwright.config.*",
  ]),
  {
    rules: {
      // codebase uses any intentionally
      "@typescript-eslint/no-explicit-any": "off",
      // minified files may alias this
      "@typescript-eslint/no-this-alias": "warn",
      // warn instead of error for next.js link rule
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
]);

export default eslintConfig;

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/display-name": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Presentation components cannot import Supabase directly. Use module clients or hooks instead.",
            },
            {
              name: "@supabase/ssr",
              message: "Presentation components cannot import Supabase directly. Use module clients or hooks instead.",
            },
            {
              name: "@/lib/supabase/client",
              message: "Presentation components cannot import Supabase directly. Use module clients or hooks instead.",
            },
            {
              name: "@/lib/supabase/server",
              message: "Presentation components cannot import Supabase directly. Use module clients or hooks instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "react", "**/infrastructure/**"],
              message: "Domain layer must remain pure and cannot import Supabase, React, or Infrastructure.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["modules/*/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "**/infrastructure/**"],
              message: "Application layer cannot import Supabase or Infrastructure directly.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "artifacts/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ]
  }
];

export default eslintConfig;

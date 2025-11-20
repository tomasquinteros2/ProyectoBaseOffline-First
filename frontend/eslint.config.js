import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import refreshPlugin from "eslint-plugin-react-refresh";

export default tseslint.config(
    {
      ignores: ["dist/", "node_modules/", "eslint.config.js", "vite.config.ts"],
    },

    tseslint.configs.base,

    {
      files: ["src/**/*.{ts,tsx}"],
      extends: [
        ...tseslint.configs.recommendedTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          tsconfigRootDir: import.meta.dirname,
        },
        globals: {
          ...globals.browser,
        },
      },
      plugins: {
        react: pluginReact,
        "react-hooks": hooksPlugin,
        "react-refresh": refreshPlugin,
      },
      rules: {
        ...pluginReact.configs.recommended.rules,
        ...hooksPlugin.configs.recommended.rules,

        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],

        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            "checksVoidReturn": {
              "attributes": false
            }
          }
        ]
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
);
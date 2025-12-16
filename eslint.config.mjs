import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginImport from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import prettier from 'eslint-plugin-prettier';

const projectRoot = new URL('.', import.meta.url);

const typescriptRecommendedRules = {
  ...tsPlugin.configs.recommended.rules,
  ...tsPlugin.configs['recommended-type-checked'].rules,
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      'client/public/**',
      'backend/drizzle/**',
    ],
  },
  {
    files: ['client/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './client/tsconfig.json',
        tsconfigRootDir: projectRoot,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        JSX: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: eslintPluginImport,
      unicorn,
      prettier,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './client/tsconfig.json',
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptRecommendedRules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...jsxA11y.configs.recommended.rules,
      ...eslintPluginImport.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-unresolved': 'error',
      'unicorn/prefer-module': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['backend/**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './backend/tsconfig.json',
        tsconfigRootDir: projectRoot,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: globals.node,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: eslintPluginImport,
      unicorn,
      prettier,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './backend/tsconfig.json',
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptRecommendedRules,
      ...eslintPluginImport.configs.recommended.rules,
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-unresolved': 'error',
      'unicorn/prefer-module': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prettier/prettier': 'warn',
    },
  },
];

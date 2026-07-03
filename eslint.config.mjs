// ESLint configuration for icke-scores (aligned with adchain-frontend)

import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import functional from 'eslint-plugin-functional'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import preferArrow from 'eslint-plugin-prefer-arrow-functions'
import prettier from 'eslint-plugin-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sonarjs from 'eslint-plugin-sonarjs'
import unusedImports from 'eslint-plugin-unused-imports'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
      'dist/**',
      '.cache/**',
    ],
  },

  // Base JavaScript config
  js.configs.recommended,

  // Next.js and TypeScript configs
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Base configuration for all TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      sonarjs: sonarjs,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'prefer-arrow': preferArrow,
      prettier: prettier,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      // ========================================
      // TypeScript Rules
      // ========================================
      '@typescript-eslint/no-explicit-any': 'error', // Ban 'any' types in runtime code
      '@typescript-eslint/no-non-null-assertion': 'error', // Ban '!' assertions
      '@typescript-eslint/no-unnecessary-condition': 'error', // Ban unnecessary null/undefined checks
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never', // Ban 'as' type casting
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'], // Prefer 'type' over 'interface'
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // ========================================
      // Import Organization
      // ========================================
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // React and Next.js first
            ['^react', '^next'],
            // External packages
            ['^@?\\w'],
            // Internal aliases (@/*)
            ['^@/'],
            // Relative imports
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': ['error', { 'prefer-inline': true }],

      // ========================================
      // Code Quality
      // ========================================
      'sonarjs/cognitive-complexity': ['error', 15], // Max complexity ≤ 15
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'], // Only console.warn and console.error allowed
        },
      ],
      'spaced-comment': ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',

      // ========================================
      // Function Style
      // ========================================
      'prefer-arrow/prefer-arrow-functions': [
        'warn',
        {
          disallowPrototype: true,
          singleReturnOnly: false,
          classPropertiesAllowed: false,
        },
      ],
      'prefer-arrow-callback': [
        'warn',
        {
          allowNamedFunctions: true,
        },
      ],
      'func-style': [
        'warn',
        'expression',
        {
          allowArrowFunctions: true,
        },
      ],

      // ========================================
      // React Rules
      // ========================================
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // Strict enforcement (not warn)
      'react-hooks/set-state-in-effect': 'off', // Pages fetch on mount and set state from effects (no react-query here)

      // ========================================
      // Accessibility
      // ========================================
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // ========================================
      // Prettier Integration
      // ========================================
      'prettier/prettier': 'error',
    },
  },

  // Override for test files - relaxed rules
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '__tests__/**/*.ts',
      '__tests__/**/*.tsx',
      '__tests__/**/*.js',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow '!' in tests
      '@typescript-eslint/no-empty-function': 'off', // Allow empty functions for mocks
      '@typescript-eslint/consistent-type-assertions': 'off', // Allow 'as' casting in tests (e.g., as jest.Mock)
      '@typescript-eslint/no-unnecessary-condition': 'off', // Tests often assert against loose types
      'sonarjs/cognitive-complexity': 'off', // Tests can be complex
      'prefer-arrow/prefer-arrow-functions': 'off',
      'func-style': 'off',
      'no-console': 'off',
    },
  },

  // Override for TypeScript declaration files - allow interfaces for module augmentation
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off', // Allow both type and interface in .d.ts files
    },
  },

  // Override for vendored shadcn/ui components - keep upstream style
  {
    files: ['src/components/ui/**'],
    rules: {
      'prefer-arrow/prefer-arrow-functions': 'off',
      'func-style': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // Functional programming rules for production code (not tests)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    plugins: {
      functional: functional,
    },
    rules: {
      'functional/immutable-data': 'warn',
      'functional/no-let': 'error',
    },
  },

  // Prettier config (must be last to disable conflicting rules)
  prettierConfig,
]

export default eslintConfig

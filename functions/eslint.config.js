const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // Global ignores
  {
    ignores: ['lib/**/*', 'node_modules/**/*', 'eslint.config.js', '**/*.test.ts', '**/*.spec.ts']
  },

  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly',
        NodeJS: 'readonly'
      },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      }
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Code Style
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],

      // Best Practices
      'no-console': 'off', // Allow console in Cloud Functions
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    }
  }
);

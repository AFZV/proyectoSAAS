// eslint.config.mjs
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'], // ignora su propio archivo
  },

  // Reglas recomendadas de ESLint
  eslint.configs.recommended,

  // Reglas recomendadas de TypeScript con type-check
  ...tseslint.configs.recommendedTypeChecked,

  // Reglas recomendadas de Prettier
  prettierRecommended,

  // Configuraciones adicionales
  {
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json', // necesario para type-check
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: prettierPlugin, // importante para que Prettier funcione
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto', // o 'auto', pero 'lf' evita conflictos en Git cross-OS
        },
      ],
    },
  },
);

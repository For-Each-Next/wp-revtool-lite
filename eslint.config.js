/**
 * @file eslint.config.js
 * Purpose: eslint.config module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Exports
 */

import { fileURLToPath } from 'node:url';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

const parserOptions = {
    projectService: true,
    tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
    extraFileExtensions: ['.vue'],
};
const typeCheckedRules = {
    ...tseslint.configs['recommended-type-checked'].rules,
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: false },
    ],
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },

    {
        files: ['**/*.{js,mjs,ts,tsx,vue}'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-template': 'error',
            'object-shorthand': 'error',
            'object-curly-spacing': ['error', 'always'],
            quotes: ['error', 'single', { avoidEscape: true }],
            indent: 'off',
            'no-tabs': 'error',
        },
    },

    {
        files: ['src/**/*.{ts,tsx}', 'src/types/host.d.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions,
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: typeCheckedRules,
    },

    ...vuePlugin.configs['flat/recommended'],
    {
        rules: {
            'vue/attributes-order': 'off',
            'vue/component-definition-name-casing': 'off',
            'vue/first-attribute-linebreak': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/html-closing-bracket-spacing': 'off',
            'vue/html-end-tags': 'off',
            'vue/html-indent': 'off',
            'vue/html-quotes': 'off',
            'vue/html-self-closing': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'vue/no-multi-spaces': 'off',
            'vue/script-indent': 'off',
            'vue/singleline-html-element-content-newline': 'off',
        },
    },

    {
        files: ['src/**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ...parserOptions,
            },
        },
        plugins: {
            vue: vuePlugin,
            '@typescript-eslint': tseslint,
        },
        rules: typeCheckedRules,
    },
];

/**
 * @file tests/css-module.test.mjs
 * Purpose: tests / css module.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Test scenarios
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import esbuild from 'esbuild';
import { createCssModule } from '../scripts/build-plugins.mjs';

const stylesheet = await readFile(
    new URL(
        '../src/features/annotations/components/styles.css',
        import.meta.url,
    ),
    'utf8',
);
const css = `${stylesheet}\n.example::before {\n    content: "\\A \`literal\` \${literal}";\n}\n`;

for (const minify of [false, true]) {
    test(`CSS keeps real line breaks and its exact contents with minify=${minify}`, async () => {
        const { code } = await esbuild.transform(createCssModule(css), {
            format: 'iife',
            globalName: 'styles',
            target: 'es2019',
            minify,
        });
        assert.ok(code.includes('.review-tool-dialog {\n'));
        const context = vm.createContext({});
        vm.runInContext(code, context);
        assert.equal(context.styles.default, css);
    });
}

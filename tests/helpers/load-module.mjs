/**
 * @file tests/helpers/load-module.mjs
 * Purpose: tests / helpers / load module module.
 *
 * Table of contents:
 * 1. Imports
 * 2. compileModule
 */

import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

export async function compileModule(path) {
    const { outputFiles } = await build({
        entryPoints: [
            fileURLToPath(new URL(`../../src/${path}`, import.meta.url)),
        ],
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'testModule',
        target: 'es2019',
    });
    return (globals) => {
        const context = vm.createContext(globals);
        vm.runInContext(outputFiles[0].text, context);
        return context.testModule;
    };
}

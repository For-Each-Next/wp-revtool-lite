/**
 * @file scripts/build-plugins.mjs
 * Purpose: Compile local Vue components and embed styles without bundling browser runtimes.
 *
 * Table of contents:
 * 1. Imports
 * 2. rewriteVueNamedImports
 * 3. Constants and state
 * 4. createCssModule
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import { basename } from 'node:path';

function rewriteVueNamedImports(code) {
    return code.replace(
        /import\s*\{([^}]+)\}\s*from\s*["']vue["'];?/g,
        (_match, spec) => {
            return spec
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => {
                    const [original, local = original] =
                        part.split(/\s+as\s+/i);
                    if (original === 'defineComponent') {
                        return `const ${local} = options => options;`;
                    }
                    return `const ${local} = (...args) => getVueRuntime().${original}(...args);`;
                })
                .join('\n');
        },
    );
}

export const vueSfcPlugin = {
    name: 'vue-sfc',
    setup(build) {
        build.onLoad(
            { filter: /[/\\]components[/\\].*\.ts$/ },
            async (args) => {
                const source = rewriteVueNamedImports(
                    await readFile(args.path, 'utf8'),
                );
                const runtime = fileURLToPath(
                    new URL(
                        '../src/platform/mediawiki/vue-runtime.ts',
                        import.meta.url,
                    ),
                );
                return {
                    contents: `import { getVueRuntime } from ${JSON.stringify(runtime)};\n${source}`,
                    loader: 'ts',
                };
            },
        );
        build.onLoad({ filter: /\.vue$/ }, async (args) => {
            const source = await readFile(args.path, 'utf8');
            const { descriptor, errors } = parse(source, {
                filename: args.path,
            });
            if (errors.length) throw new Error(errors.map(String).join('\n'));
            if (
                descriptor.styles.length ||
                descriptor.customBlocks.length ||
                descriptor.script ||
                descriptor.scriptSetup ||
                descriptor.template?.src
            ) {
                throw new Error(
                    'Vue files contain templates only; behavior and styles belong in colocated TypeScript and CSS.',
                );
            }
            if (descriptor.template?.lang) {
                throw new Error('Vue components support HTML templates only.');
            }
            // Hash the content so builds are identical across checkout locations.
            const id = createHash('sha256')
                .update(source)
                .digest('hex')
                .slice(0, 8);
            const scriptCode = `import __sfc__ from './${basename(args.path, '.vue')}.ts';`;

            let templateCode = '';
            if (descriptor.template?.content.trim()) {
                const template = compileTemplate({
                    source: descriptor.template.content,
                    filename: args.path,
                    id,
                    compilerOptions: {
                        mode: 'function',
                        runtimeGlobalName: 'Vue',
                        hoistStatic: false,
                    },
                });
                if (template.errors.length)
                    throw new Error(template.errors.map(String).join('\n'));
                const importRegex =
                    /^import\s*\{([^}]+)\}\s*from\s*["']vue["'];?/m;
                const constRegex = /^const\s*\{([^}]+)\}\s*=\s*Vue;?/m;
                const helperList = (
                    template.code.match(importRegex)?.[1] ??
                    template.code.match(constRegex)?.[1] ??
                    ''
                ).trim();
                templateCode = template.code
                    .replace(importRegex, '')
                    .replace(constRegex, '')
                    .replace(/^return function render/m, 'function render')
                    .replace(/^export function render/m, 'function render')
                    .replace(/^export const render/m, 'const render');
                if (helperList) {
                    templateCode = templateCode.replace(
                        /function render\(([^)]*)\)\s*\{/,
                        (match) => {
                            return `${match}\n  const {${helperList}} = getVueRuntime();\n`;
                        },
                    );
                }
                templateCode += '\n__sfc__.render = render;';
            }
            const runtime = fileURLToPath(
                new URL(
                    '../src/platform/mediawiki/vue-runtime.ts',
                    import.meta.url,
                ),
            );
            return {
                contents: `import { getVueRuntime } from ${JSON.stringify(runtime)};\n${scriptCode}\n${templateCode}\nexport default __sfc__;\n`,
                loader: 'ts',
            };
        });
    },
};

export function createCssModule(css) {
    // Escape JavaScript template syntax while retaining the exact CSS text.
    return `export default \`${css.replace(/\\|`|\$\{/g, '\\$&')}\`;\n`;
}

export const cssTextPlugin = {
    name: 'css-text',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => ({
            contents: createCssModule(await readFile(args.path, 'utf8')),
            loader: 'js',
        }));
    },
};

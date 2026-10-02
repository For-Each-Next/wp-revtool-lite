/**
 * @file src/platform/mediawiki/vue-runtime.ts
 * Purpose: src / platform / mediawiki / vue runtime module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setVueRuntime
 * 4. getVueRuntime
 */

import type { VueModule } from './dialog';

let runtime: VueModule | null = null;

/** Keep the ResourceLoader runtime private to this gadget. */
export function setVueRuntime(value: VueModule): void {
    runtime = value;
}

/** Components are mounted only after the dialog adapter loads the host runtime. */
export function getVueRuntime(): VueModule {
    if (!runtime) throw new Error('The MediaWiki Vue runtime is not loaded.');
    return runtime;
}

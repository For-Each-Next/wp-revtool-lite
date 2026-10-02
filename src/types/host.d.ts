/**
 * @file src/types/host.d.ts
 * Purpose: src / types / host.d module.
 *
 * Table of contents:
 * 1. Ambient declarations
 * 2. Window
 */

declare module '*.css' {
    const content: string;
    export default content;
}

declare module '*.vue' {
    const component: import('vue').Component;
    export default component;
}

interface Window {
    RLQ?: { push(callback: () => void): unknown };
    reviewToolLite?: Promise<void>;
}

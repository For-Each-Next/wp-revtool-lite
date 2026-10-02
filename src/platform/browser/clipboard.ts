/**
 * @file src/platform/browser/clipboard.ts
 * Purpose: Copy through the current secure-context API; callers display failures.
 *
 * Table of contents:
 * 1. copyText
 */

export async function copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}

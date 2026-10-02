/**
 * @file src/domain/order-key.ts
 * Purpose: src / domain / order key module.
 *
 * Table of contents:
 * 1. compareOrderKeys
 */

export function compareOrderKeys(a?: string | null, b?: string | null): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    const partsA = a.split('.').map((part) => Number.parseInt(part, 10));
    const partsB = b.split('.').map((part) => Number.parseInt(part, 10));
    const len = Math.min(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        if (partsA[i] !== partsB[i]) {
            return partsA[i] - partsB[i];
        }
    }

    return partsA.length - partsB.length;
}

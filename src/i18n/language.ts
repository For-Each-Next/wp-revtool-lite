/**
 * @file src/i18n/language.ts
 * Purpose: src / i18n / language module.
 *
 * Table of contents:
 * 1. Imports
 * 2. translateVariants
 */

import type { ChineseVariants } from '../shared/translation';

/** Select the user's Chinese variant without loading a separate gadget. */
export function translateVariants(
    variants: ChineseVariants,
    language: string | null,
): string {
    return /^zh-(?:hans|cn|sg|my)$/i.test(language || '')
        ? variants.hans
        : variants.hant;
}

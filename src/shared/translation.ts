/**
 * @file src/shared/translation.ts
 * Purpose: Host-independent shape of the supported Chinese interface variants.
 *
 * Table of contents:
 * 1. ChineseVariants
 * 2. TranslateVariants
 */

export type ChineseVariants = { hant: string; hans: string };
export type TranslateVariants = (variants: ChineseVariants) => string;

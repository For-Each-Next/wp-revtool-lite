/**
 * @file src/features/annotations/responsive-actions.ts
 * Purpose: Keep stacked action order consistent for sighted and keyboard users.
 *
 * Table of contents:
 * 1. useStackedDialogActions
 * 2. Imports
 */

export function useStackedDialogActions() {
    const query = '(max-width: 480px) and (min-height: 481px)';
    const media = window.matchMedia?.(query);
    // ResourceLoader owns Vue; a regular runtime import would bundle a second copy.
    const { ref, onMounted, onUnmounted } = getVueRuntime();
    const stacked = ref(media?.matches ?? false);
    const update = () => {
        stacked.value = media?.matches ?? false;
    };
    onMounted(() => media?.addEventListener('change', update));
    onUnmounted(() => media?.removeEventListener('change', update));
    return stacked;
}
import { getVueRuntime } from '../../platform/mediawiki/vue-runtime';

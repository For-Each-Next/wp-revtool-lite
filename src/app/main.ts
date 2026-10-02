/**
 * @file src/app/main.ts
 * Purpose: src / app / main module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. injectStyles
 * 4. initialize
 * 5. init
 */

import state from '../platform/mediawiki/context';
import styles from '../features/annotations/components/styles.css';
import { addMainPageReviewToolButtonsToDOM } from './article-controller';

let initialization: Promise<void> | null = null;

/** Install the application stylesheet once per document. */
function injectStyles(css: string): void {
    if (!css || document.getElementById('review-tool-styles')) return;
    const style = document.createElement('style');
    style.id = 'review-tool-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

function initialize(): void {
    // Review only rendered articles, leaving source editors untouched.
    const namespace = mw.config.get('wgNamespaceNumber');
    const pageName = mw.config.get('wgPageName');
    if (namespace !== 0 || mw.config.get('wgAction') !== 'view') {
        return;
    }

    // Inject bundled CSS into the page.
    injectStyles(styles);

    state.articleTitle = pageName;
    mw.hook('wikipage.content').add(() =>
        addMainPageReviewToolButtonsToDOM(pageName),
    );
}

/** Start once, while allowing a retry if a required host capability fails. */
export function init(): Promise<void> {
    initialization ??= Promise.resolve()
        .then(initialize)
        .catch((error) => {
            initialization = null;
            throw error;
        });
    return initialization;
}

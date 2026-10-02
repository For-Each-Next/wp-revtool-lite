/**
 * @file src/app/browser.ts
 * Purpose: Wait for ResourceLoader whether this script loads before or after MediaWiki.
 *
 * Table of contents:
 * 1. waitForMediaWiki
 * 2. startReviewTool
 * 3. Initialization and execution
 * 4. Exports
 */

function waitForMediaWiki(): Promise<void> {
    return new Promise((resolve) => {
        const queue: NonNullable<Window['RLQ']> = window.RLQ ?? [];
        window.RLQ = queue;
        queue.push(() => resolve());
    });
}

async function startReviewTool(): Promise<void> {
    await waitForMediaWiki();
    await mw.loader.using('mediawiki.util');

    // State and other application modules access MediaWiki during initialization.
    // Keep their evaluation deferred until ResourceLoader is ready.
    const { init } = await import('./main');
    await init();
}

// Console pastes and userscripts may both load the gadget on the same page.
if (!window.reviewToolLite) {
    const startup = startReviewTool();
    window.reviewToolLite = startup;
    void startup.catch((error) => {
        if (window.reviewToolLite === startup) delete window.reviewToolLite;
        console.error('[ReviewTool] Initialization failed', error);
    });
}

export {};

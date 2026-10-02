/**
 * @file src/platform/browser/dom/heading.ts
 * Purpose: src / platform / browser / dom / heading module.
 *
 * Table of contents:
 * 1. getHeadingTitle
 */

/**
 * 在 mw-heading 元素中提取章節標題。
 * @param heading {Element} mw-heading 元素
 * @returns {string | null} 章節標題或 null
 */
export function getHeadingTitle(heading: Element): string | null {
    if (!heading) return null;
    // the heading might already be an HTMLHeadingElement
    const htmlHeading =
        heading instanceof HTMLHeadingElement
            ? heading
            : heading.querySelector('h1, h2, h3, h4, h5, h6');
    if (!htmlHeading) return null;
    // prefer explicit id on the HTMLHeadingElement
    if (htmlHeading.id) return htmlHeading.id;
    // some wikis put an inner span with the encoded id (e.g. .E4.B9...)
    const innerWithId = htmlHeading.querySelector('[id]');
    if (innerWithId?.id) return innerWithId.id;
    // fallback to data-mw-thread-id
    const threadId = htmlHeading.getAttribute('data-mw-thread-id');
    if (threadId) return threadId;
    // last resort: use the visible text
    const text = htmlHeading.textContent?.trim();
    return text || null;
}

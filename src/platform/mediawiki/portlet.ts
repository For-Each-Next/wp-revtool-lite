/**
 * @file src/platform/mediawiki/portlet.ts
 * Purpose: Add a native MediaWiki tools-menu link and bind its action.
 *
 * Table of contents:
 * 1. addPortletTrigger
 */

export function addPortletTrigger(
    portletId: string,
    label: string,
    onClick: () => void,
): void {
    let item = document.getElementById(portletId);
    if (!item) {
        for (const target of ['p-cactions', 'p-tb']) {
            item = mw.util.addPortletLink(target, '#', label, portletId, label);
            if (item) break;
        }
    }
    if (!item) return;

    const link = item.querySelector('a');
    if (!link) return;

    // Update the label without replacing wrappers supplied by the skin.
    const text = document
        .createTreeWalker(link, NodeFilter.SHOW_TEXT)
        .nextNode();
    if (text) text.nodeValue = label;
    else link.appendChild(document.createTextNode(label));
    link.title = label;
    // Reassign our handler so repeated content updates cannot accumulate listeners.
    link.onclick = (event) => {
        event.preventDefault();
        onClick();
    };
}

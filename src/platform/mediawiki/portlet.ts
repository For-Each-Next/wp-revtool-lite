/**
 * @file src/platform/mediawiki/portlet.ts
 * Purpose: Add an action button inside the active skin's tools portlet.
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

    // Replacing only our control releases its previous listener while preserving skin markup.
    const existing = item.querySelector('a, button');
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
        'cdx-button cdx-button--action-default cdx-button--weight-quiet review-tool-portlet-button';
    button.textContent = label;
    button.title = label;
    button.addEventListener('click', onClick);
    if (existing) existing.replaceWith(button);
    else item.appendChild(button);
}

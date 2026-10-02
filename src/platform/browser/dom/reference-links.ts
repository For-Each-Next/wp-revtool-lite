/**
 * @file src/platform/browser/dom/reference-links.ts
 * Purpose: src / platform / browser / dom / reference links module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. ReferenceCopyFormat
 * 4. buildFootnotePermalink
 * 5. localFragment
 * 6. citationLink
 * 7. isLocator
 * 8. footnoteLabel
 * 9. webUrl
 * 10. archiveUrl
 * 11. externalLink
 * 12. archiveMonth
 * 13. citationDetails
 * 14. getReferenceLinkData
 * 15. installReferenceLinkTips
 */

import { copyText } from '../clipboard';
import state from '../../mediawiki/context';

export const REFERENCE_MARKER_SELECTOR = '.reference, .mw-ref';
export const REFERENCE_CONTROLS_SELECTOR = '.review-tool-reference-tip';
type ReferenceCopyFormat = 'footnote' | 'comment';

const escapeWikitext = (text: string): string =>
    text.replace(
        /[&<>[\]{}|\r\n]/g,
        (character) => `&#${character.charCodeAt(0)};`,
    );
const validRevision = (revisionId: number): boolean =>
    Number.isSafeInteger(revisionId) && revisionId > 0;

export function buildFootnotePermalink(
    revisionId: number,
    footnoteId: string,
    label: string,
): string | null {
    if (
        !validRevision(revisionId) ||
        !/^cite_ref-.+/.test(footnoteId) ||
        !label.trim()
    )
        return null;
    return `[[Special:Permalink/${revisionId}#${escapeWikitext(footnoteId)}|${escapeWikitext(label.trim())}]]`;
}

function localFragment(link: HTMLAnchorElement): string | null {
    try {
        const url = new URL(link.href, window.location.href);
        if (
            url.origin !== window.location.origin ||
            url.pathname !== window.location.pathname ||
            (url.search && url.search !== window.location.search)
        )
            return null;
        return decodeURIComponent(url.hash.slice(1));
    } catch {
        return null;
    }
}

function citationLink(marker: Element): HTMLAnchorElement | null {
    return (
        Array.from(marker.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
            (link) => localFragment(link)?.startsWith('cite_note-'),
        ) ?? null
    );
}

function isLocator(marker: Element): boolean {
    // Template:Rp uses the reference class too, but has no Cite anchor/link.
    return (
        marker.tagName === 'SUP' &&
        marker.matches('.reference') &&
        marker.matches('.nowrap') &&
        !marker.id.startsWith('cite_ref-') &&
        !citationLink(marker)
    );
}

function footnoteLabel(
    root: Element,
    link: HTMLAnchorElement,
    marker: Element,
    citation: Element,
): string {
    const label = (link.innerText ?? link.textContent ?? '')
        .trim()
        .replace(/^\[\s*|\s*\]$/g, '');
    // Read the rendered number, including subreference numbers. Internal Cite IDs
    // are not display numbers (e.g. cite_ref-52-1 can be displayed as 11.12).
    if (!/^\d+(?:\.\d+)*$/.test(label)) return label;
    // Backlinks can be wrapped together, individually, or identified by rel.
    // Deduplicate targets so another tool's repeated links cannot shift a/b/c.
    let occurrences = Array.from(
        new Set(
            Array.from(citation.querySelectorAll<HTMLAnchorElement>('a[href]'))
                .filter((backlink) =>
                    backlink.closest(
                        '.mw-cite-backlink, [rel~="mw:referencedBy"]',
                    ),
                )
                .map(localFragment)
                .filter((id) => id?.startsWith('cite_ref-')),
        ),
    );
    if (occurrences.length < 2 || !occurrences.includes(marker.id)) {
        // Some renderers/gadgets omit or replace backlink markup. The article's
        // actual markers still identify repeated uses of the same citation.
        occurrences = Array.from(
            new Set(
                Array.from(root.querySelectorAll(REFERENCE_MARKER_SELECTOR))
                    .filter((item) => {
                        const anchor = citationLink(item);
                        return (
                            item.id.startsWith('cite_ref-') &&
                            anchor &&
                            localFragment(anchor) === citation.id
                        );
                    })
                    .map((item) => item.id),
            ),
        );
    }
    const index = occurrences.indexOf(marker.id);
    if (occurrences.length < 2 || index < 0) return label;
    let suffix = '';
    for (
        let number = index + 1;
        number > 0;
        number = Math.floor((number - 1) / 26)
    ) {
        suffix = String.fromCharCode(97 + ((number - 1) % 26)) + suffix;
    }
    return label + suffix;
}

function webUrl(href: string): URL | null {
    try {
        const url = new URL(href, window.location.href);
        return /^https?:$/.test(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

function archiveUrl(url: URL): boolean {
    return /(^|\.)(?:web\.archive\.org|archive\.(?:today|is|ph|vn|md|fo|li)|webcitation\.org|perma\.cc)$/.test(
        url.hostname,
    );
}

function externalLink(url: URL, label: string): string {
    // URL delimiters must be percent-encoded; text labels use character entities.
    const href = url.href.replace(/[\s<>[\]{}|]/g, (character) =>
        encodeURIComponent(character),
    );
    return `[${href} ${escapeWikitext(label)}]`;
}

function archiveMonth(text: string, url: URL): string | null {
    const numericDate =
        text.match(/存[檔档]\s*[於于]\s*(\d{4})(?:-|年\s*)(\d{1,2})/) ??
        text.match(
            /archived(?:\s+from\s+the\s+original)?(?:\s*\([^)]*\))?\s+on\s+(\d{4})-(\d{1,2})/i,
        );
    const englishDate = text.match(
        /archived(?:\s+from\s+the\s+original)?(?:\s*\([^)]*\))?\s+on\s+(?:\d{1,2}\s+)?([a-z]+)\.?\s+(?:\d{1,2},?\s+)?(\d{4})/i,
    );
    const timestamp = url.pathname.match(
        /^\/(?:web\/)?(\d{4})(\d{2})\d{2}\d*(?:[a-z_]+)?\//,
    );
    // Prefer the citation's archive date; publication/access dates are unrelated.
    const dates = [
        numericDate && [Number(numericDate[1]), Number(numericDate[2])],
        englishDate && [
            Number(englishDate[2]),
            [
                'jan',
                'feb',
                'mar',
                'apr',
                'may',
                'jun',
                'jul',
                'aug',
                'sep',
                'oct',
                'nov',
                'dec',
            ].indexOf(englishDate[1].slice(0, 3).toLowerCase()) + 1,
        ],
        timestamp && [Number(timestamp[1]), Number(timestamp[2])],
    ];
    const date = dates.find(
        (value) => value && value[0] > 0 && value[1] >= 1 && value[1] <= 12,
    );
    return date ? `${date[0]}年${date[1]}月` : null;
}

function citationDetails(
    reference: HTMLElement,
    format: ReferenceCopyFormat,
): { wikitext: string; title: string; url: string | null } {
    const content =
        reference.querySelector<HTMLElement>(
            '.reference-text, .mw-reference-text',
        ) ?? reference;
    const citation =
        content.querySelector<HTMLElement>('.citation') ??
        content.querySelector('cite') ??
        content;
    const links = Array.from(
        citation.querySelectorAll<HTMLAnchorElement>('a[href]'),
    ).flatMap((link) => {
        // Read MediaWiki's source links within the narrow citation body, not
        // arbitrary anchors that tools may insert for icons, help, or actions.
        if (
            !link.matches('.external') &&
            !link.getAttribute('rel')?.split(/\s+/).includes('mw:ExtLink')
        )
            return [];
        if (
            link.closest(
                '.mw-cite-backlink, .cs1-maint, .cs1-visible-error, .mw-editsection, button, [role="button"], [role="menu"], [role="tooltip"], [data-gadget], [data-widget]',
            ) ||
            link.matches('.extiw')
        )
            return [];
        const url = webUrl(link.href);
        return url && url.origin !== window.location.origin
            ? [{ link, url }]
            : [];
    });
    const archive = links.find(({ url }) => archiveUrl(url));
    // Dead citations put the archive in the title and the original URL later.
    const original =
        links.find(
            ({ link, url }) =>
                !archiveUrl(url) &&
                /^(?:原始(?:內容|内容|文獻|文献)|the original|original)(?:\s|$)/i.test(
                    (link.textContent ?? '').trim(),
                ),
        ) ?? links.find(({ url }) => !archiveUrl(url));
    const embeddedOriginal = archive?.url.href.match(/\/(https?:\/\/.+)$/)?.[1];
    const source =
        original?.url ?? (embeddedOriginal ? webUrl(embeddedOriginal) : null);
    const details: string[] = [];
    if (source)
        details.push(
            externalLink(source, source.hostname.replace(/^www\./, '')),
        );
    if (archive) {
        const text = citation.innerText ?? citation.textContent ?? '';
        const archiveDate = archiveMonth(text, archive.url);
        const archiveLabel =
            format === 'comment'
                ? `${archiveDate ?? ''}存`
                : state.convByVar({
                      hant: archiveDate ? `存檔於${archiveDate}` : '存檔',
                      hans: archiveDate ? `存档于${archiveDate}` : '存档',
                  });
        details.push(externalLink(archive.url, archiveLabel));
    }
    // A dead source uses its archive for the linked title; "原始內容" is
    // merely the helper link back to the original URL, not the source's title.
    const titleLink =
        [original, archive].find(
            (item) =>
                item &&
                !/^(?:原始(?:內容|内容|文獻|文献)|存[檔档]|the original|original|archived?)(?:\s|$)/i.test(
                    (item.link.textContent ?? '').trim(),
                ),
        ) ??
        original ??
        archive;
    const title = (titleLink?.link.textContent || citation.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    const wikitext = !details.length
        ? ''
        : format === 'comment'
          ? `<small>（${details.join('，')}）</small>`
          : ` <small>(${details.join(', ')})</small>`;
    return {
        wikitext,
        title,
        url: titleLink?.url.href ?? source?.href ?? null,
    };
}

export function getReferenceLinkData(
    root: Element,
    marker: Element,
    format: ReferenceCopyFormat = 'footnote',
): {
    label: string;
    footnote: string | null;
    title: string;
    url: string;
} | null {
    const link = citationLink(marker);
    const referenceId = link ? localFragment(link) : null;
    const target = referenceId ? document.getElementById(referenceId) : null;
    const revisionId = mw.config.get('wgRevisionId');
    if (
        !validRevision(revisionId) ||
        !link ||
        !referenceId ||
        !/^cite_note-.+/.test(referenceId) ||
        !root.contains(marker) ||
        !target ||
        !root.contains(target)
    )
        return null;
    const label = footnoteLabel(root, link, marker, target);
    const footnote = buildFootnotePermalink(
        revisionId,
        marker.id,
        format === 'comment' ? `Ref. ${label}` : label,
    );
    const details = citationDetails(target, format);
    return {
        footnote: footnote ? footnote + details.wikitext : null,
        label,
        title:
            details.title ||
            state.convByVar({ hant: `註腳 ${label}`, hans: `脚注 ${label}` }),
        url:
            details.url ??
            new URL(`#${encodeURIComponent(referenceId)}`, window.location.href)
                .href,
    };
}

export function installReferenceLinkTips(root: Element): () => void {
    // Only this separate button opens our popup. The original marker retains all
    // hover/click/focus events used by Reference Tooltips and Reference Previews.
    const tip = document.createElement('span');
    tip.className = 'review-tool-reference-tip';
    tip.hidden = true;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'review-tool-reference-trigger';
    trigger.textContent = state.convByVar({ hant: '複製 ▾', hans: '复制 ▾' });
    trigger.title = state.convByVar({ hant: '複製', hans: '复制' });
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('span');
    menu.className = 'review-tool-reference-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute(
        'aria-label',
        state.convByVar({ hant: '註腳複製選單', hans: '脚注复制菜单' }),
    );
    menu.hidden = true;
    let actionButtons: HTMLButtonElement[] = [];
    const makeAction = (label: string, text: string | null) => {
        const action = document.createElement('button');
        action.type = 'button';
        action.textContent = label;
        action.setAttribute('role', 'menuitem');
        action.tabIndex = -1;
        action.disabled = !text;
        action.title = text ?? '';
        action.onclick = (event) => copy(event, text);
        menu.appendChild(action);
        actionButtons.push(action);
    };
    tip.append(trigger, menu);

    let activeLink: HTMLAnchorElement | null = null;
    let activeMarkers: Element[] = [];
    const closeMenu = (restoreFocus = false) => {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) trigger.focus();
    };
    const hide = () => {
        closeMenu();
        tip.hidden = true;
        activeLink = null;
        activeMarkers = [];
        menu.replaceChildren();
        actionButtons = [];
    };
    const linkData = (link: HTMLAnchorElement) => {
        const marker = link.closest(REFERENCE_MARKER_SELECTOR);
        return marker && citationLink(marker) === link
            ? getReferenceLinkData(root, marker)
            : null;
    };
    const adjacentMarker = (
        marker: Element,
        direction: 'previousSibling' | 'nextSibling',
    ): Element | null => {
        let node: Node | null = marker;
        while (node) {
            // Sentence wrapping is transparent, but never cross a paragraph boundary.
            while (!node[direction] && node.parentElement?.matches('.sentence'))
                node = node.parentElement;
            node = node[direction];
            while (
                node instanceof Element &&
                node.matches('.sentence') &&
                node.firstChild
            ) {
                node =
                    direction === 'nextSibling'
                        ? node.firstChild
                        : node.lastChild;
            }
            if (!node) return null;
            if (
                node === tip ||
                node.nodeType === Node.COMMENT_NODE ||
                (node.nodeType === Node.TEXT_NODE &&
                    !node.textContent?.trim()) ||
                (node instanceof Element &&
                    node.matches('.sentence') &&
                    !node.firstChild)
            )
                continue;
            return node instanceof Element &&
                root.contains(node) &&
                node.matches(REFERENCE_MARKER_SELECTOR)
                ? node
                : null;
        }
        return null;
    };
    const show = (event: Event) => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLAnchorElement>('a[href]');
        const marker = link?.closest(REFERENCE_MARKER_SELECTOR);
        if (!link || !marker || !root.contains(link) || isLocator(marker))
            return;
        const data = linkData(link);
        if (!data) {
            hide();
            return;
        }
        const markers = [marker];
        let sibling: Element | null = marker;
        while ((sibling = adjacentMarker(sibling, 'previousSibling')))
            markers.unshift(sibling);
        sibling = marker;
        while ((sibling = adjacentMarker(sibling, 'nextSibling')))
            markers.push(sibling);
        activeLink = link;
        // The button belongs to the whole group. Crossing another marker on the
        // way to it must not change the available actions or dismiss an open menu.
        if (
            !menu.hidden &&
            markers.length === activeMarkers.length &&
            markers.every((item, index) => item === activeMarkers[index])
        )
            return;
        const references = markers
            .filter((item) => !isLocator(item))
            .map((item) => {
                const anchor = citationLink(item);
                return anchor ? linkData(anchor) : null;
            });

        closeMenu();
        activeMarkers = markers;
        menu.replaceChildren();
        actionButtons = [];
        for (const reference of references) {
            if (!reference) continue;
            makeAction(
                state.convByVar({
                    hant: `複製${reference.label}`,
                    hans: `复制${reference.label}`,
                }),
                reference.footnote,
            );
        }
        // Locators are transparent; a broken actual reference must not be omitted.
        const links = references.map((reference) => reference?.footnote);
        if (links.length > 1 && links.every(Boolean)) {
            makeAction(
                state.convByVar({ hant: '複製本組', hans: '复制本组' }),
                links.join(', '),
            );
        }
        trigger.setAttribute(
            'aria-label',
            references.length > 1
                ? state.convByVar({
                      hant: '複製本組',
                      hans: '复制本组',
                  })
                : state.convByVar({
                      hant: `複製${data.label}`,
                      hans: `复制${data.label}`,
                  }),
        );
        const lastMarker = markers[markers.length - 1];
        if (lastMarker.nextSibling !== tip) lastMarker.after(tip);
        tip.hidden = false;
    };
    const actions = () => actionButtons.filter((button) => !button.disabled);
    const positionMenu = () => {
        if (menu.hidden) return;
        const anchor = trigger.getBoundingClientRect();
        const bounds = menu.getBoundingClientRect();
        const gap = 4;
        const maxLeft = Math.max(gap, window.innerWidth - bounds.width - gap);
        const maxTop = Math.max(gap, window.innerHeight - bounds.height - gap);
        const previews = Array.from(
            document.querySelectorAll('.rt-tooltip, .mwe-popups'),
        )
            .map((preview) => preview.getBoundingClientRect())
            .filter((rect) => rect.width && rect.height);
        const candidates = [
            { left: anchor.left, top: anchor.bottom + gap },
            { left: anchor.left, top: anchor.top - bounds.height - gap },
            ...previews.flatMap((rect) => [
                { left: rect.right + gap, top: anchor.bottom + gap },
                {
                    left: rect.left - bounds.width - gap,
                    top: anchor.bottom + gap,
                },
                { left: anchor.left, top: rect.bottom + gap },
                { left: anchor.left, top: rect.top - bounds.height - gap },
            ]),
        ].map((point) => ({
            left: Math.max(gap, Math.min(point.left, maxLeft)),
            top: Math.max(gap, Math.min(point.top, maxTop)),
        }));
        const position =
            candidates.find((point) =>
                previews.every(
                    (rect) =>
                        point.left + bounds.width <= rect.left ||
                        point.left >= rect.right ||
                        point.top + bounds.height <= rect.top ||
                        point.top >= rect.bottom,
                ),
            ) ?? candidates[0];
        menu.style.left = `${position.left}px`;
        menu.style.top = `${position.top}px`;
    };
    const openMenu = (last = false) => {
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        positionMenu();
        const buttons = actions();
        buttons[last ? buttons.length - 1 : 0]?.focus();
    };
    trigger.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (menu.hidden) openMenu();
        else closeMenu(true);
    };
    trigger.onkeydown = (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        event.stopPropagation();
        openMenu(event.key === 'ArrowUp');
    };
    menu.onkeydown = (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
            return;
        event.preventDefault();
        event.stopPropagation();
        const buttons = actions();
        const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        const index =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (current +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        buttons.length) %
                    buttons.length;
        buttons[index]?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab' && !menu.hidden) closeMenu(true);
        if (event.key !== 'Escape' || tip.hidden) return;
        if (!menu.hidden) {
            closeMenu(true);
        } else {
            if (tip.contains(document.activeElement)) activeLink?.focus();
            hide();
        }
    };
    const onOutsidePointer = (event: Event) => {
        if (!(event.target instanceof Node) || !tip.contains(event.target))
            closeMenu();
    };
    const onFocusOut = (event: FocusEvent) => {
        if (
            !(event.relatedTarget instanceof Node) ||
            !tip.contains(event.relatedTarget)
        )
            closeMenu();
    };
    tip.onclick = (event) => event.stopPropagation();
    tip.addEventListener('focusout', onFocusOut);
    const copy = (event: MouseEvent, text: string | null) => {
        event.preventDefault();
        event.stopPropagation();
        if (!text) return;
        closeMenu(true);
        void copyText(text)
            .then(() => {
                mw.notify(
                    state.convByVar({
                        hant: '已複製永久連結。',
                        hans: '已复制永久链接。',
                    }),
                    { tag: 'review-tool-reference' },
                );
            })
            .catch((error) => {
                console.error(
                    '[ReviewTool] Failed to copy reference link',
                    error,
                );
                mw.notify(
                    state.convByVar({
                        hant: '無法複製連結，請檢查剪貼簿權限後重試。',
                        hans: '无法复制链接，请检查剪贴板权限后重试。',
                    }),
                    {
                        type: 'error',
                        tag: 'review-tool-reference',
                    },
                );
            });
    };
    // Keep the trigger available when moving into or scrolling a native preview.
    root.addEventListener('mouseover', show, { capture: true });
    root.addEventListener('focusin', show, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onOutsidePointer);
    window.addEventListener('scroll', positionMenu, { capture: true });
    window.addEventListener('resize', positionMenu);
    return () => {
        hide();
        root.removeEventListener('mouseover', show, { capture: true });
        root.removeEventListener('focusin', show, { capture: true });
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('pointerdown', onOutsidePointer);
        window.removeEventListener('scroll', positionMenu, { capture: true });
        window.removeEventListener('resize', positionMenu);
        tip.removeEventListener('focusout', onFocusOut);
        tip.remove();
    };
}

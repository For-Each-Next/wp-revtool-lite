/**
 * @file tests/reference-links.test.mjs
 * Purpose: tests / reference links.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. addCitation
 * 5. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileModule } from './helpers/load-module.mjs';

const createReferenceLinks = await compileModule(
    'platform/browser/dom/reference-links.ts',
);

function setup({
    revisionId = 12345,
    markerClass = 'reference',
    referenceId = 'cite_note-Ozawa2023-3',
    footnoteId = 'cite_ref-Ozawa2023_3-0',
    label = '[3]',
} = {}) {
    class Node extends EventTarget {
        static ELEMENT_NODE = 1;
        static TEXT_NODE = 3;
        static COMMENT_NODE = 8;
        constructor(nodeType, text = '') {
            super();
            this.nodeType = nodeType;
            this.data = text;
            this.childNodes = [];
            this.parentElement = null;
        }
        get textContent() {
            return this.nodeType === 1
                ? this.childNodes.map((child) => child.textContent).join('')
                : this.data;
        }
        set textContent(text) {
            this.childNodes = [];
            this.append(text);
        }
        get children() {
            return this.childNodes.filter((child) => child instanceof Element);
        }
        get firstChild() {
            return this.childNodes[0] ?? null;
        }
        get lastChild() {
            return this.childNodes.at(-1) ?? null;
        }
        get previousSibling() {
            return (
                this.parentElement?.childNodes[
                    this.parentElement.childNodes.indexOf(this) - 1
                ] ?? null
            );
        }
        get nextSibling() {
            return (
                this.parentElement?.childNodes[
                    this.parentElement.childNodes.indexOf(this) + 1
                ] ?? null
            );
        }
        append(...children) {
            children.forEach((child) =>
                this.appendChild(
                    typeof child === 'string' ? new Node(3, child) : child,
                ),
            );
        }
        replaceChildren(...children) {
            [...this.childNodes].forEach((child) => child.remove());
            this.append(...children);
        }
        appendChild(child) {
            child.remove();
            child.parentElement = this;
            this.childNodes.push(child);
            return child;
        }
        after(child) {
            child.remove();
            child.parentElement = this.parentElement;
            this.parentElement.childNodes.splice(
                this.parentElement.childNodes.indexOf(this) + 1,
                0,
                child,
            );
        }
        remove() {
            if (this.parentElement) {
                this.parentElement.childNodes =
                    this.parentElement.childNodes.filter(
                        (child) => child !== this,
                    );
                this.parentElement = null;
            }
        }
        contains(node) {
            for (let current = node; current; current = current.parentElement)
                if (current === this) return true;
            return false;
        }
    }
    class Element extends Node {
        constructor(tagName = 'span') {
            super(1);
            this.tagName = tagName.toUpperCase();
            this.className = '';
            this.id = '';
            this.hidden = false;
            this.disabled = false;
            this.style = {};
            this.attributes = {};
            this.rect = {
                left: 100,
                top: 100,
                right: 150,
                bottom: 120,
                width: 50,
                height: 20,
            };
        }
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
        getAttribute(name) {
            return this.attributes[name] ?? null;
        }
        getBoundingClientRect() {
            return this.rect;
        }
        matches(selector) {
            return selector.split(',').some((part) => {
                const item = part.trim();
                return item === 'a[href]'
                    ? this.tagName === 'A' && Boolean(this.href)
                    : item.startsWith('.')
                      ? this.className.split(' ').includes(item.slice(1))
                      : this.tagName === item.toUpperCase();
            });
        }
        closest(selector) {
            for (let current = this; current; current = current.parentElement)
                if (current.matches(selector)) return current;
            return null;
        }
        querySelectorAll(selector) {
            return this.children.flatMap((child) => [
                ...(child.matches(selector) ? [child] : []),
                ...child.querySelectorAll(selector),
            ]);
        }
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] ?? null;
        }
        focus() {
            document.activeElement = this;
        }
    }
    const body = new Element('body');
    const root = body.appendChild(new Element('main'));
    const paragraph = root.appendChild(new Element('p'));
    const references = root.appendChild(new Element('ol'));
    let nextId = 0;
    const addReference = (
        id,
        {
            parent = paragraph,
            className = markerClass,
            footnoteId: anchor = `cite_ref-${++nextId}`,
            label: text = '[4]',
        } = {},
    ) => {
        const marker = parent.appendChild(new Element('sup'));
        marker.id = anchor;
        marker.className = className;
        const link = marker.appendChild(new Element('a'));
        link.href = `#${encodeURIComponent(id)}`;
        const number = link.appendChild(new Element('span'));
        number.textContent = text;
        let reference = references.children.find((item) => item.id === id);
        if (!reference) {
            reference = references.appendChild(new Element('li'));
            reference.id = id;
            reference.appendChild(new Element('span')).className =
                'mw-cite-backlink';
        }
        const backlink = reference.firstChild.appendChild(new Element('a'));
        backlink.href = `#${encodeURIComponent(anchor)}`;
        return { marker, link, number, reference, backlink };
    };
    const addLocator = (parent = paragraph) => {
        const marker = parent.appendChild(new Element('sup'));
        marker.className = 'reference nowrap';
        const text = marker.appendChild(new Element('span'));
        text.setAttribute('title', '頁碼/位置：6');
        text.textContent = ':\u200a6\u200a';
        return marker;
    };
    const first = addReference(referenceId, { footnoteId, label });
    const createdElements = [];
    const document = {
        body,
        activeElement: null,
        createElement: (name) => {
            const element = new Element(name);
            createdElements.push(element);
            return element;
        },
        getElementById: (id) =>
            references.children.find((child) => child.id === id) ?? null,
        querySelectorAll: (selector) => body.querySelectorAll(selector),
    };
    const window = Object.assign(new EventTarget(), {
        location: new URL('https://zh.wikipedia.org/wiki/Test?oldid=12345'),
        innerWidth: 1024,
        innerHeight: 768,
    });
    const copies = [];
    const notifications = [];
    const api = createReferenceLinks({
        Element,
        Node,
        HTMLElement: Element,
        document,
        window,
        URL,
        navigator: {
            clipboard: {
                writeText: async (text) => {
                    copies.push(text);
                },
            },
        },
        mw: {
            config: {
                get: (key) =>
                    key === 'wgRevisionId' ? revisionId : 'Reviewer',
            },
            notify: (...args) => notifications.push(args),
        },
        console,
    });
    const cleanup = api.installReferenceLinkTips(root);
    const tip = createdElements.find(
        (element) => element.className === 'review-tool-reference-tip',
    );
    const menu = createdElements.find(
        (element) => element.className === 'review-tool-reference-menu',
    );
    const trigger = tip.firstChild;
    const footnoteButton = (label = '3') =>
        menu.children.find((button) => button.textContent === `複製${label}`);
    const groupButton = () =>
        menu.children.find((button) => button.textContent === '複製本組');
    const fire = (type, target = first.number, surface = root) => {
        const event = new Event(type, { cancelable: true });
        Object.defineProperty(event, 'target', { value: target });
        surface.dispatchEvent(event);
        return event;
    };
    return {
        api,
        root,
        paragraph,
        ...first,
        tip,
        menu,
        trigger,
        footnoteButton,
        groupButton,
        window,
        document,
        copies,
        notifications,
        cleanup,
        fire,
        addReference,
        addLocator,
        Element,
        Node,
    };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
const click = (button) =>
    button.onclick(new Event('click', { cancelable: true }));
const key = (target, value) => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'key', { value });
    if (target.onkeydown) target.onkeydown(event);
    else target.dispatchEvent(event);
    return event;
};
const footnoteLink = (id, label) =>
    `[[Special:Permalink/12345#${id}|${label}]]`;

const firstFootnote = footnoteLink('cite_ref-Ozawa2023_3-0', '3');

function addCitation(fixture, parts, reference = fixture.reference) {
    const content = reference.appendChild(new fixture.Element('span'));
    content.className = 'reference-text';
    const citation = content.appendChild(new fixture.Element('cite'));
    for (const part of parts) {
        if (typeof part === 'string') citation.append(part);
        else {
            const link = citation.appendChild(new fixture.Element('a'));
            link.className = 'external text';
            link.href = part[0];
            link.textContent = part[1];
        }
    }
    return citation;
}

for (const archivedTitle of [false, true]) {
    test(`footnote copying includes source and archive details with ${archivedTitle ? 'archived' : 'live'} title links`, async () => {
        const fixture = setup({ label: '[3a]' });
        const source = 'https://www.example.com/article?one=1&two=2';
        const archive = `https://web.archive.org/web/20230901000000/${source}`;
        addCitation(fixture, [
            [archivedTitle ? archive : source, 'Article title'],
            '. 2023-08-01. [2023-08-15]. （',
            [archivedTitle ? source : archive, '原始内容'],
            '存档于2023-10-02）.',
        ]);
        fixture.fire('mouseover');
        click(fixture.footnoteButton('3a'));
        await settle();
        assert.deepEqual(fixture.copies, [
            `${footnoteLink('cite_ref-Ozawa2023_3-0', '3a')} <small>([${source} example.com], [${archive} 存檔於2023年10月])</small>`,
        ]);
    });
}

test('source-only and grouped footnotes include their own citation details', async () => {
    const fixture = setup();
    addCitation(fixture, [
        ['https://www.example.com/article', 'Article title'],
    ]);
    const second = fixture.addReference('cite_note-4', {
        footnoteId: 'cite_ref-4',
    });
    addCitation(
        fixture,
        [
            ['https://news.example.org/story', 'Second title'],
            '. （',
            ['https://archive.today/abc123', '原始內容'],
            '存檔於2023年9月1日）.',
        ],
        second.reference,
    );
    fixture.fire('mouseover');
    click(fixture.footnoteButton());
    click(fixture.groupButton());
    await settle();
    const first = `${firstFootnote} <small>([https://www.example.com/article example.com])</small>`;
    const other = `${footnoteLink('cite_ref-4', '4')} <small>([https://news.example.org/story news.example.org], [https://archive.today/abc123 存檔於2023年9月])</small>`;
    assert.deepEqual(fixture.copies, [first, `${first}, ${other}`]);
});

test('archive-only Wayback citations recover the source URL and snapshot date', async () => {
    const fixture = setup();
    const source = 'https://example.com/article?q=1&lang=en#section';
    const archive = `https://web.archive.org/web/20230901123456id_/${source}`;
    addCitation(fixture, [[archive, 'Article title']]);
    fixture.fire('mouseover');
    click(fixture.footnoteButton());
    await settle();
    assert.deepEqual(fixture.copies, [
        `${firstFootnote} <small>([${source} example.com], [${archive} 存檔於2023年9月])</small>`,
    ]);
});

test('archive labels use Chinese year and month for supported date formats', async () => {
    for (const [description, label] of [
        [
            '. Archived from the original on 1 September 2023.',
            '存檔於2023年9月',
        ],
        ['. Archived on September 1, 2023.', '存檔於2023年9月'],
        [
            '. Archived from the original (PDF) on 2023-09-01.',
            '存檔於2023年9月',
        ],
        ['. Archived on September 2023.', '存檔於2023年9月'],
        ['. 存檔於2023年9月。', '存檔於2023年9月'],
        ['. 存档 于 2023-09-01。', '存檔於2023年9月'],
        ['. Published 2020-05-25. Accessed 2024-07-10.', '存檔'],
        ['. 存檔於2023-13-01。', '存檔'],
        ['', '存檔'],
    ]) {
        const fixture = setup();
        addCitation(fixture, [
            ['https://archive.ph/abc123', 'Article title'],
            description,
        ]);
        fixture.fire('mouseover');
        click(fixture.footnoteButton());
        await settle();
        assert.deepEqual(fixture.copies, [
            `${firstFootnote} <small>([https://archive.ph/abc123 ${label}])</small>`,
        ]);
    }
});

test('citation details skip internal and unsafe links and encode wikitext URL delimiters', async () => {
    const fixture = setup();
    addCitation(fixture, [
        ['https://zh.wikipedia.org/wiki/Author', 'Author'],
        ['javascript:alert(1)', 'Invalid source'],
        ['https://example.com/a[1]?q={value}|x&next=2', 'Article title'],
    ]);
    fixture.fire('mouseover');
    click(fixture.footnoteButton());
    await settle();
    assert.deepEqual(fixture.copies, [
        `${firstFootnote} <small>([https://example.com/a%5B1%5D?q=%7Bvalue%7D%7Cx&next=2 example.com])</small>`,
    ]);
});

test('the copy menu contains only footnote actions with unbracketed labels', async () => {
    const { fire, menu, footnoteButton, copies } = setup({ label: '[18c]' });
    fire('mouseover');
    assert.deepEqual(
        menu.children.map((button) => button.textContent),
        ['複製18c'],
    );
    click(footnoteButton('18c'));
    await settle();
    assert.deepEqual(copies, [footnoteLink('cite_ref-Ozawa2023_3-0', '18c')]);
});

test('footnotes preserve full anchors and labels while escaping wikitext', () => {
    const { api } = setup();
    assert.equal(
        api.buildFootnotePermalink(12345, 'cite_ref-Ozawa2023_3-0', '3a'),
        footnoteLink('cite_ref-Ozawa2023_3-0', '3a'),
    );
    assert.equal(
        api.buildFootnotePermalink(12345, 'cite_ref-中文&|]-0', '5.1a|x'),
        footnoteLink('cite_ref-中文&#38;&#124;&#93;-0', '5.1a&#124;x'),
    );
    for (const revision of [0, -1, NaN, 1.5]) {
        assert.equal(
            api.buildFootnotePermalink(revision, 'cite_ref-3', '3'),
            null,
        );
    }
    for (const id of ['cite_note-3', 'cite_ref-', ''])
        assert.equal(api.buildFootnotePermalink(12345, id, '3'), null);
    assert.equal(api.buildFootnotePermalink(12345, 'cite_ref-3', ' '), null);
});

for (const markerClass of ['reference', 'mw-ref']) {
    test(`${markerClass} preserves native tooltip events and opens the menu only from a separate button`, async () => {
        const {
            fire,
            tip,
            menu,
            trigger,
            footnoteButton,
            groupButton,
            marker,
            link,
            root,
            copies,
            notifications,
        } = setup({ markerClass });
        const href = link.href;
        const markerText = marker.textContent;
        const previewEvents = [];
        for (const type of ['mouseover', 'focusin', 'click'])
            root.addEventListener(type, (event) =>
                previewEvents.push(event.type),
            );
        assert.equal(tip.hidden, true);
        for (const type of ['mouseover', 'focusin', 'click'])
            assert.equal(fire(type).defaultPrevented, false);
        assert.deepEqual(previewEvents, ['mouseover', 'focusin', 'click']);
        assert.equal(tip.hidden, false);
        assert.equal(menu.hidden, true);
        assert.equal(marker.nextSibling, tip);
        assert.equal(trigger.closest('.reference, .mw-ref'), null);
        assert.equal(trigger.closest('a[href]'), null);
        assert.equal(trigger.textContent, '複製 ▾');
        assert.equal(trigger.getAttribute('aria-label'), '複製3');
        assert.equal(groupButton(), undefined);
        assert.equal(marker.textContent, markerText);
        assert.equal(link.href, href);
        click(trigger);
        assert.equal(menu.hidden, false);
        assert.equal(trigger.getAttribute('aria-expanded'), 'true');
        click(footnoteButton());
        await settle();
        assert.deepEqual(copies, [firstFootnote]);
        assert.equal(menu.hidden, true);
        assert.equal(notifications.length, 1);
    });
}

test('Ozawa2023 repeated footnotes use the display number and their own occurrence', async () => {
    const { addReference, fire, footnoteButton, copies } = setup();
    const second = addReference('cite_note-Ozawa2023-3', {
        footnoteId: 'cite_ref-Ozawa2023_3-1',
        label: '[3]',
    });
    fire('mouseover');
    click(footnoteButton('3a'));
    fire('mouseover', second.number);
    click(footnoteButton('3b'));
    await settle();
    assert.deepEqual(copies, [
        footnoteLink('cite_ref-Ozawa2023_3-0', '3a'),
        footnoteLink('cite_ref-Ozawa2023_3-1', '3b'),
    ]);
});

test('new Cite anchors use the displayed subreference label, not the internal number', async () => {
    const { addReference, fire, footnoteButton, copies } = setup({
        referenceId: 'cite_note-52',
        footnoteId: 'cite_ref-52',
        label: '[11.12]',
    });
    const second = addReference('cite_note-52', {
        footnoteId: 'cite_ref-52-1',
        label: '[11.12]',
    });
    fire('mouseover', second.number);
    click(footnoteButton('11.12b'));
    await settle();
    assert.deepEqual(copies, [footnoteLink('cite_ref-52-1', '11.12b')]);
});

test('adjacent references preserve each displayed label and anchor, from any marker', async () => {
    const {
        addReference,
        fire,
        tip,
        trigger,
        menu,
        footnoteButton,
        groupButton,
        copies,
        number,
    } = setup({ label: '[3a]' });
    const second = addReference('cite_note-4', {
        footnoteId: 'cite_ref-4',
        label: '[4]',
    });
    const last = addReference('cite_note-52', {
        footnoteId: 'cite_ref-52-1',
        label: '[5.1a]',
    });
    const expected = [
        footnoteLink('cite_ref-Ozawa2023_3-0', '3a'),
        footnoteLink('cite_ref-4', '4'),
        footnoteLink('cite_ref-52-1', '5.1a'),
    ];
    for (const [index, target] of [
        number,
        second.number,
        last.number,
    ].entries()) {
        fire('mouseover', target);
        assert.ok(groupButton());
        assert.equal(last.marker.nextSibling, tip);
        click(trigger);
        assert.equal(menu.hidden, false);
        click(footnoteButton(['3a', '4', '5.1a'][index]));
        click(groupButton());
        await settle();
        assert.equal(copies.at(-2), expected[index]);
        assert.equal(copies.at(-1), expected.join(', '));
    }
});

test('the group-end menu can copy [18] after crossing [19] on the way to the trigger', async () => {
    const {
        addReference,
        fire,
        tip,
        trigger,
        menu,
        footnoteButton,
        groupButton,
        copies,
    } = setup({
        referenceId: 'cite_note-18',
        footnoteId: 'cite_ref-18',
        label: '[18]',
    });
    const second = addReference('cite_note-19', {
        footnoteId: 'cite_ref-19',
        label: '[19]',
    });
    fire('mouseover');
    fire('mouseover', second.number);
    fire('mouseover', trigger);
    assert.equal(second.marker.nextSibling, tip);
    click(trigger);
    assert.deepEqual(
        menu.children.map((button) => button.textContent),
        ['複製18', '複製19', '複製本組'],
    );
    assert.equal(trigger.getAttribute('aria-label'), '複製本組');
    click(footnoteButton('18'));
    click(trigger);
    click(footnoteButton('19'));
    click(trigger);
    click(groupButton());
    await settle();
    assert.deepEqual(copies, [
        footnoteLink('cite_ref-18', '18'),
        footnoteLink('cite_ref-19', '19'),
        [
            footnoteLink('cite_ref-18', '18'),
            footnoteLink('cite_ref-19', '19'),
        ].join(', '),
    ]);
});

test('moving between markers in an open group keeps its actions and keyboard focus', () => {
    const { addReference, fire, trigger, menu, footnoteButton, document } =
        setup();
    const second = addReference('cite_note-4');
    fire('mouseover');
    click(trigger);
    const firstAction = footnoteButton();
    firstAction.focus();
    fire('mouseover', second.number);
    assert.equal(menu.hidden, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(footnoteButton(), firstAction);
    assert.equal(document.activeElement, firstAction);
});

test('Scorn locators neither enter the output nor split a footnote group', async () => {
    const {
        addReference,
        addLocator,
        fire,
        footnoteButton,
        groupButton,
        tip,
        copies,
        number,
        marker,
        paragraph,
    } = setup({
        referenceId: 'cite_note-ArtBook-11',
        footnoteId: 'cite_ref-ArtBook_11-4',
        label: '[11e]',
    });
    const middleLocator = addLocator();
    const second = addReference('cite_note-Warr@160719-17', {
        footnoteId: 'cite_ref-Warr@160719_17-1',
        label: '[16b]',
    });
    const trailingLocator = addLocator();
    const leadingLocator = addLocator();
    paragraph.append(
        leadingLocator,
        marker,
        middleLocator,
        second.marker,
        trailingLocator,
    );
    const expected = [
        footnoteLink('cite_ref-ArtBook_11-4', '11e'),
        footnoteLink('cite_ref-Warr@160719_17-1', '16b'),
    ].join(', ');
    for (const target of [number, second.number]) {
        fire('mouseover', target);
        assert.ok(groupButton());
        assert.equal(tip.previousSibling, trailingLocator);
        click(groupButton());
        await settle();
        assert.equal(copies.at(-1), expected);
    }
    fire('mouseover', middleLocator.firstChild);
    click(footnoteButton('16b'));
    await settle();
    assert.equal(
        copies.at(-1),
        footnoteLink('cite_ref-Warr@160719_17-1', '16b'),
    );
});

test('a lone citation with locators has no group action; real nowrap citations still count', () => {
    const { addLocator, addReference, fire, groupButton } = setup();
    addLocator();
    fire('mouseover');
    assert.equal(groupButton(), undefined);
    addReference('cite_note-4', { className: 'reference nowrap' });
    fire('mouseover');
    assert.ok(groupButton());
});

test('locators alone never open a copy control', () => {
    const { addLocator, fire, tip } = setup();
    const locator = addLocator();
    fire('mouseover', locator.firstChild);
    assert.equal(tip.hidden, true);
});

test('groups skip whitespace and comments, retaining repeated references', async () => {
    const { paragraph, Node, addReference, fire, groupButton, copies } =
        setup();
    paragraph.append(' \n\t', new Node(Node.COMMENT_NODE, 'template boundary'));
    addReference('cite_note-4', { footnoteId: 'cite_ref-4' });
    addReference('cite_note-Ozawa2023-3', {
        footnoteId: 'cite_ref-Ozawa2023_3-1',
        label: '[3]',
    });
    fire('mouseover');
    click(groupButton());
    await settle();
    assert.deepEqual(copies, [
        [
            footnoteLink('cite_ref-Ozawa2023_3-0', '3a'),
            footnoteLink('cite_ref-4', '4'),
            footnoteLink('cite_ref-Ozawa2023_3-1', '3b'),
        ].join(', '),
    ]);
});

test('sentence wrappers and locators are transparent to reference grouping', async () => {
    const {
        paragraph,
        marker,
        Element,
        addReference,
        addLocator,
        fire,
        groupButton,
        copies,
    } = setup();
    const firstSentence = paragraph.appendChild(new Element('span'));
    firstSentence.className = 'sentence';
    firstSentence.append(marker, ' ');
    addLocator(firstSentence);
    const emptySentence = paragraph.appendChild(new Element('span'));
    emptySentence.className = 'sentence';
    const secondSentence = paragraph.appendChild(new Element('span'));
    secondSentence.className = 'sentence';
    secondSentence.append(' ');
    const second = addReference('cite_note-4', {
        parent: secondSentence,
        footnoteId: 'cite_ref-4',
    });
    for (const target of [marker.firstChild, second.number]) {
        fire('mouseover', target);
        click(groupButton());
        await settle();
        assert.equal(
            copies.at(-1),
            [firstFootnote, footnoteLink('cite_ref-4', '4')].join(', '),
        );
    }
});

for (const boundary of ['text', 'punctuation', 'paragraph', 'br']) {
    test(`groups stop at intervening ${boundary}`, () => {
        const { paragraph, root, Element, addReference, fire, groupButton } =
            setup();
        if (boundary === 'text') paragraph.append('Different statement');
        if (boundary === 'punctuation') paragraph.append('。');
        if (boundary === 'br') paragraph.appendChild(new Element('br'));
        addReference('cite_note-4', {
            parent:
                boundary === 'paragraph'
                    ? root.appendChild(new Element('p'))
                    : paragraph,
        });
        fire('mouseover');
        assert.equal(groupButton(), undefined);
    });
}

test('broken actual references suppress group copying instead of silently dropping items', () => {
    for (const breakReference of [
        (item) => item.reference.remove(),
        (item) => {
            item.marker.id = '';
        },
    ]) {
        const { addReference, fire, tip, groupButton, copies } = setup();
        const second = addReference('cite_note-4');
        breakReference(second);
        fire('mouseover');
        assert.equal(tip.hidden, false);
        assert.equal(groupButton(), undefined);
        assert.deepEqual(copies, []);
    }
});

test('missing footnote anchors disable copying and keyboard navigation skips the disabled action', async () => {
    const {
        addReference,
        fire,
        trigger,
        menu,
        footnoteButton,
        groupButton,
        document,
        copies,
    } = setup();
    const second = addReference('cite_note-4');
    second.marker.id = '';
    fire('mouseover');
    assert.equal(footnoteButton('4').disabled, true);
    assert.equal(groupButton(), undefined);
    key(trigger, 'ArrowDown');
    key(menu, 'ArrowDown');
    assert.equal(document.activeElement, footnoteButton());
    click(footnoteButton());
    await settle();
    assert.deepEqual(copies, [firstFootnote]);
});

test('moving into and scrolling a native preview keeps the copy trigger available', () => {
    const { fire, document, window, tip } = setup();
    const preview = document.createElement('div');
    document.body.appendChild(preview);
    fire('mouseover');
    fire('mouseout');
    fire('focusout');
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    assert.equal(tip.hidden, false);
});

test('the popup avoids visible Reference Tooltips and stays within the viewport', () => {
    const { fire, document, tip, trigger, menu, window } = setup();
    const preview = document.createElement('div');
    preview.className = 'rt-tooltip';
    preview.rect = {
        left: 80,
        right: 380,
        top: 110,
        bottom: 280,
        width: 300,
        height: 170,
    };
    document.body.appendChild(preview);
    menu.rect = { width: 160, height: 100 };
    fire('mouseover');
    click(trigger);
    const left = Number.parseFloat(menu.style.left);
    const top = Number.parseFloat(menu.style.top);
    assert.ok(left >= 4 && left + 160 <= window.innerWidth);
    assert.ok(top >= 4 && top + 100 <= window.innerHeight);
    assert.ok(
        left >= 380 || left + 160 <= 80 || top >= 280 || top + 100 <= 110,
    );
    assert.equal(tip.hidden, false);
});

test('keyboard menu navigation, Escape, Tab and outside dismissal', () => {
    const {
        addReference,
        fire,
        tip,
        menu,
        trigger,
        footnoteButton,
        groupButton,
        link,
        window,
        document,
    } = setup();
    addReference('cite_note-4');
    fire('focusin', link);
    key(trigger, 'ArrowDown');
    assert.equal(document.activeElement, footnoteButton());
    assert.equal(menu.getAttribute('role'), 'menu');
    key(menu, 'ArrowDown');
    assert.equal(document.activeElement, footnoteButton('4'));
    key(menu, 'ArrowDown');
    assert.equal(document.activeElement, groupButton());
    key(menu, 'Home');
    assert.equal(document.activeElement, footnoteButton());
    key(menu, 'End');
    assert.equal(document.activeElement, groupButton());
    key(menu, 'ArrowDown');
    assert.equal(document.activeElement, footnoteButton());
    key(menu, 'ArrowUp');
    assert.equal(document.activeElement, groupButton());
    key(window, 'Escape');
    assert.equal(menu.hidden, true);
    assert.equal(document.activeElement, trigger);
    key(trigger, 'ArrowUp');
    assert.equal(document.activeElement, groupButton());
    key(window, 'Tab');
    assert.equal(menu.hidden, true);
    click(trigger);
    fire('pointerdown', document.body, window);
    assert.equal(menu.hidden, true);
    key(window, 'Escape');
    assert.equal(tip.hidden, true);
    assert.equal(document.activeElement, link);
});

test('switching to a different group closes the popup and replaces its actions', async () => {
    const {
        paragraph,
        addReference,
        fire,
        trigger,
        menu,
        footnoteButton,
        copies,
    } = setup();
    paragraph.append('Different statement');
    const second = addReference('cite_note-4');
    fire('mouseover');
    click(trigger);
    fire('mouseover', second.number);
    assert.equal(menu.hidden, true);
    assert.equal(footnoteButton(), undefined);
    click(trigger);
    click(footnoteButton('4'));
    await settle();
    assert.deepEqual(copies, [footnoteLink(second.marker.id, '4')]);
});

test('focus can move within the menu; leaving it closes the popup', () => {
    const { fire, trigger, tip, menu, footnoteButton, document } = setup();
    fire('focusin');
    click(trigger);
    const focusout = (target) => {
        const event = new Event('focusout');
        Object.defineProperty(event, 'relatedTarget', { value: target });
        tip.dispatchEvent(event);
    };
    focusout(footnoteButton());
    assert.equal(menu.hidden, false);
    focusout(document.body);
    assert.equal(menu.hidden, true);
    assert.equal(tip.hidden, false);
});

test('cleanup removes controls and listeners', () => {
    const { fire, tip, trigger, menu, cleanup, window } = setup();
    fire('mouseover');
    click(trigger);
    cleanup();
    assert.equal(tip.parentElement, null);
    assert.equal(menu.hidden, true);
    fire('mouseover');
    window.dispatchEvent(new Event('resize'));
    assert.equal(tip.hidden, true);
});

test('encoded Chinese citation IDs resolve to the actual reference-list entry', async () => {
    const { fire, footnoteButton, copies } = setup({
        referenceId: 'cite_note-中文來源-3',
        footnoteId: 'cite_ref-中文來源_3-0',
    });
    fire('mouseover');
    click(footnoteButton());
    await settle();
    assert.deepEqual(copies, [footnoteLink('cite_ref-中文來源_3-0', '3')]);
});

test('invalid targets, unrelated URLs and missing revisions have no copy tip', () => {
    for (const customize of [
        (fixture) => {
            fixture.marker.className = '';
        },
        (fixture) => fixture.reference.remove(),
        (fixture) => {
            fixture.link.href = 'https://example.com/#cite_note-Ozawa2023-3';
        },
        (fixture) => {
            fixture.link.href =
                'https://zh.wikipedia.org/wiki/Other#cite_note-Ozawa2023-3';
        },
        (fixture) => {
            fixture.link.href = '#cite_ref-3';
        },
        (fixture) => {
            fixture.link.href = '#cite_note-%ZZ';
        },
    ]) {
        const fixture = setup();
        customize(fixture);
        fixture.fire('mouseover');
        assert.equal(fixture.tip.hidden, true);
    }
    const noRevision = setup({ revisionId: 0 });
    noRevision.fire('mouseover');
    assert.equal(noRevision.tip.hidden, true);
});

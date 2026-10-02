/**
 * @file tests/formatting.test.mjs
 * Purpose: tests / formatting.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. annotation
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileModule } from './helpers/load-module.mjs';

const order = (await compileModule('domain/annotation-order.ts'))();
const review = (await compileModule('domain/writing-review.ts'))();
const sentences = (await compileModule('domain/sentences.ts'))();
const plain = (value) => JSON.parse(JSON.stringify(value));

function annotation(id, sectionPath, sentencePos, createdAt) {
    return {
        id,
        sectionPath,
        sentencePos,
        createdAt,
        sentenceText: id,
        opinion: `意見 ${id}`,
    };
}

test('groups trimmed section names, including names shared with object properties', () => {
    const items = [
        annotation('a', '  序言 ', '2', 3),
        annotation('b', '序言', '1', 2),
        annotation('c', '__proto__', '3', 1),
    ];
    assert.deepEqual(plain(order.groupAnnotations(items)), [
        { sectionPath: '序言', annotations: items.slice(0, 2) },
        { sectionPath: '__proto__', annotations: [items[2]] },
    ]);
});

test('sorts positions numerically, breaks ties by time, and preserves input arrays', () => {
    const items = [
        annotation('late', '後段', '10', 5),
        annotation('second', '前段', '2.10', 4),
        annotation('first', '前段', '2.2', 3),
        annotation('older', '前段', '2.2', 1),
    ];
    const groups = order.groupAnnotations(items);
    const original = plain(groups);
    groups.forEach((group) => Object.freeze(group.annotations));
    const sorted = order.sortGroupsByPosition([
        ...groups,
        { sectionPath: '空', annotations: [] },
    ]);
    assert.deepEqual(
        plain(sorted.map((group) => group.annotations.map((item) => item.id))),
        [['older', 'first', 'second'], ['late']],
    );
    assert.deepEqual(plain(groups), original);
});

test('chronological sorting retains repeated sections separated by another section', () => {
    const items = [
        annotation('c', '甲', '3', 3),
        annotation('a', '甲', '1', 1),
        annotation('b', '乙', '2', 2),
    ];
    assert.deepEqual(
        plain(
            order
                .groupAnnotationsByTime(items, 'asc')
                .map((group) => group.annotations[0].id),
        ),
        ['a', 'b', 'c'],
    );
    assert.deepEqual(
        plain(
            order
                .groupAnnotationsByTime(items, 'desc')
                .map((group) => group.annotations[0].id),
        ),
        ['c', 'b', 'a'],
    );
    assert.equal(items[0].id, 'c');
});

test('review chapters omit empty groups and use the fallback section title', () => {
    const groups = [
        {
            sectionPath: '後段',
            annotations: [annotation('b', '後段', '10', 1)],
        },
        { sectionPath: '', annotations: [annotation('a', '', '2', 2)] },
        { sectionPath: '空', annotations: [] },
    ];
    assert.deepEqual(
        plain(review.buildWritingReviewChapters(groups, '未指定')),
        [
            {
                title: '未指定',
                suggestions: [{ quote: 'a', suggestion: '意見 a' }],
            },
            {
                title: '後段',
                suggestions: [{ quote: 'b', suggestion: '意見 b' }],
            },
        ],
    );
});

const linkContext = {
    articleTitle: '測試條目',
    revisionId: 123,
    revisionTimestamp: '2026-01-02T03:04:00Z',
};

test('wikitext retains links, UTC revision labels, bullets, paragraphs and signatures', () => {
    const result = review.buildWritingReviewWikitext(
        [
            {
                title: '  序言  ',
                suggestions: [
                    {
                        quote: ' 原句 ',
                        suggestion:
                            '首行\r\n續行\r\n\r\n另段\n* 建議一\n續句\n** 子項',
                    },
                    { quote: '', suggestion: '無引文' },
                ],
            },
        ],
        linkContext,
    );
    assert.equal(
        result,
        "'''[[測試條目#序言|序言]]'''<small>（基于[[Special:PermaLink/123#序言|2026年1月2日 03:04]]版）</small>\n# {{rvw|1=原句}} —— 首行<br>續行{{pb}}另段\n#* 建議一<br>續句\n#** 子項\n# 無引文\n--~~~~\n\n",
    );
});

test('empty reviews stay empty and invalid revision timestamps are rejected', () => {
    assert.equal(review.buildWritingReviewWikitext([], linkContext), '');
    assert.throws(
        () =>
            review.buildWritingReviewWikitext(
                [{ title: '序言', suggestions: [] }],
                {
                    ...linkContext,
                    revisionTimestamp: 'invalid',
                },
            ),
        /Invalid revision timestamp/,
    );
});

for (const [name, text, lang, expected] of [
    [
        'Chinese quotes',
        '「第一句。」第二句！尾句',
        'zh-hant',
        ['「第一句。」', '第二句！', '尾句'],
    ],
    [
        'English punctuation',
        'First. Second? "Third!"',
        'en',
        ['First.', ' Second?', ' "Third!"'],
    ],
    [
        'Chinese decimal text',
        '數值 1.2 不拆分。下一句。',
        'zh',
        ['數值 1.2 不拆分。', '下一句。'],
    ],
    ['line breaks', '第一行\n第二行', null, ['第一行\n', '第二行']],
    ['empty text', '  \n ', 'zh', []],
]) {
    test(`sentence ranges preserve ${name}`, () => {
        const ranges = sentences.splitTextIntoRanges(text, lang);
        assert.deepEqual(
            plain(ranges.map(({ start, end }) => text.slice(start, end))),
            expected,
        );
    });
}

test('simple fallback splitting respects the language punctuation policy', () => {
    assert.equal(sentences.shouldTreatHalfWidthTerminators('zh-hans'), false);
    assert.equal(sentences.shouldTreatHalfWidthTerminators('ja'), false);
    assert.equal(sentences.shouldTreatHalfWidthTerminators('en'), true);
    assert.deepEqual(
        plain(sentences.splitTextToPartsSimple('甲；乙。丙', false)),
        ['甲；', '乙。', '丙'],
    );
    assert.deepEqual(
        plain(sentences.splitTextToPartsSimple('One. Two!', true)),
        ['One.', 'Two!'],
    );
});

/**
 * @file tests/annotation-time.test.mjs
 * Purpose: tests / annotation time.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileModule } from './helpers/load-module.mjs';

const time = (await compileModule('domain/annotation-time.ts'))({});
const timestamp = new Date(2026, 8, 23, 9, 5).getTime();
const absolute = '2026年9月23日 09:05';

for (const [minutes, expected] of [
    [0, '剛剛'],
    [0.9, '剛剛'],
    [1, '1分鐘前'],
    [45, '45分鐘前'],
    [59, '59分鐘前'],
    [60, '1小時前'],
    [1439, '23小時前'],
    [1440, '1日前'],
    [2880, '2日前'],
    [-60, '1小時後'],
]) {
    test(`formats absolute local time with ${expected}`, () => {
        assert.equal(
            time.formatAnnotationTimestamp(
                timestamp,
                timestamp + minutes * 60_000,
            ),
            `${absolute} [${expected}]`,
        );
    });
}

test('time range considers edits to older comments, independent of display order', () => {
    const annotations = [
        { createdAt: 200, updatedAt: 250 },
        { createdAt: 100, updatedAt: 500 },
        { createdAt: 300 },
    ];
    const range = time.getAnnotationTimeRange(annotations);
    assert.equal(range.first, 100);
    assert.equal(range.last, 500);
    assert.equal(annotations[0].createdAt, 200);
});

test('legacy and unedited annotations use creation time as the latest known time', () => {
    const range = time.getAnnotationTimeRange([
        { createdAt: 100 },
        { createdAt: 200, updatedAt: 50 },
    ]);
    assert.equal(range.first, 100);
    assert.equal(range.last, 200);
});

test('empty or invalid dates do not produce misleading times', () => {
    assert.equal(time.getAnnotationTimeRange([]), null);
    assert.equal(
        time.getAnnotationTimeRange([
            { createdAt: NaN },
            { createdAt: Infinity },
        ]),
        null,
    );
    for (const value of [undefined, NaN, Infinity, Number.MAX_VALUE]) {
        assert.equal(time.formatAnnotationTimestamp(value), '');
    }
    const range = time.getAnnotationTimeRange([
        { createdAt: 0, updatedAt: NaN },
    ]);
    assert.equal(range.first, 0);
    assert.equal(range.last, 0);
    assert.notEqual(time.formatAnnotationTimestamp(0), '');
});

test('timestamp formatting accepts language conversion without importing host state', () => {
    const converted = time.formatAnnotationTimestamp(
        timestamp,
        timestamp + 60_000,
        (variants) => variants.hans,
    );
    assert.equal(converted, `${absolute} [1分钟前]`);
});

/**
 * @file tests/release-notes.test.mjs
 * Purpose: tests / release notes.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractReleaseNotes } from '../scripts/release-notes.mjs';

for (const heading of [
    '1.2.3',
    '1.2.3 — 2026-10-02',
    '1.2.3 - 2026-10-02',
    '[1.2.3]',
    '[1.2.3] – 2026-10-02',
]) {
    test(`release notes use the exact changelog section ${heading}`, () => {
        const changelog = `# Changes\n\n## Unreleased\n\nFuture work.\n\n## ${heading}\n\nReviewed changes.\n\n- Detail.\n\n## 1.2.2\n\nPrevious release.\n`;
        assert.equal(
            extractReleaseNotes(changelog, '1.2.3', 'v1.2.3'),
            'Reviewed changes.\n\n- Detail.\n',
        );
    });
}

test('release notes reject tags that differ from the package version', () => {
    assert.throws(
        () => extractReleaseNotes('## 1.2.3\nChanges.', '1.2.3', 'v1.2.4'),
        /must match package version/,
    );
});

test('release notes refuse missing, empty, or overlapping version entries', () => {
    for (const changelog of [
        '# Changes',
        '## 1.2.3\n\n## 1.2.2\nOld.',
        '## 1.2.30\nOther release.',
        '## [1.2.3\nMalformed.',
        '## 1.2.3]\nMalformed.',
    ]) {
        assert.throws(
            () => extractReleaseNotes(changelog, '1.2.3', 'v1.2.3'),
            /must contain release notes/,
        );
    }
});

test('release notes accept valid prereleases and reject malformed versions', () => {
    assert.equal(
        extractReleaseNotes(
            '## 1.2.3-rc.1\nPreview.',
            '1.2.3-rc.1',
            'v1.2.3-rc.1',
        ),
        'Preview.\n',
    );
    for (const version of ['01.2.3', '1.2', '1.2.3-01', '1.2.3-']) {
        assert.throws(
            () =>
                extractReleaseNotes(
                    `## ${version}\nChanges.`,
                    version,
                    `v${version}`,
                ),
            /must match package version/,
        );
    }
});

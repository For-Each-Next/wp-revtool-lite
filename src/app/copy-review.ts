/**
 * @file src/app/copy-review.ts
 * Purpose: src / app / copy review module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. hasCopiedReview
 * 4. rememberCopiedReview
 * 5. copyWritingReview
 */

import { copyText } from '../platform/browser/clipboard';
import type { AnnotationGroup } from './annotations';
import state from '../platform/mediawiki/context';
import {
    buildWritingReviewChapters,
    buildWritingReviewWikitext,
} from '../domain/writing-review';

const reviewIntroduction =
    '意見由[https://github.com/For-Each-Next/wp-revtool-lite ReviewToolLite]協助生成。';
const copiedReviews = new Set<string>();
const storageTypes = ['localStorage', 'sessionStorage'] as const;

function hasCopiedReview(key: string): boolean {
    if (copiedReviews.has(key)) return true;
    for (const type of storageTypes) {
        try {
            if (window[type].getItem(key) === '1') return true;
        } catch {
            // Storage restrictions must not prevent copying a review.
        }
    }
    return false;
}

function rememberCopiedReview(key: string): void {
    copiedReviews.add(key);
    for (const type of storageTypes) {
        try {
            window[type].setItem(key, '1');
            return;
        } catch {
            // Fall back to session storage, then memory for this page visit.
        }
    }
}

export async function copyWritingReview(
    groups: AnnotationGroup[],
): Promise<boolean> {
    const chapters = buildWritingReviewChapters(
        groups,
        state.convByVar({
            hant: '（未指定章節）',
            hans: '（未指定章节）',
        }),
    );
    if (!chapters.length) {
        mw.notify(
            state.convByVar({
                hant: '目前沒有可複製的批註。',
                hans: '目前没有可复制的批注。',
            }),
            { type: 'warn', tag: 'review-tool' },
        );
        return false;
    }

    try {
        const revisionId = mw.config.get('wgRevisionId');
        if (!revisionId) throw new Error('Missing article revision ID');
        await mw.loader.using('mediawiki.api');
        const response = (await new mw.Api().get({
            action: 'query',
            prop: 'revisions',
            revids: revisionId,
            rvprop: 'timestamp',
            formatversion: 2,
        })) as {
            query?: { pages?: { revisions?: { timestamp?: string }[] }[] };
        };
        const revisionTimestamp =
            response.query?.pages?.[0]?.revisions?.[0]?.timestamp;
        if (!revisionTimestamp)
            throw new Error('Missing article revision timestamp');
        const articleTitle = mw.config.get('wgPageName') || state.articleTitle;
        const historyKey = `reviewtool:review-copied:${articleTitle.replace(/_/g, ' ')}`;
        const reviewText = buildWritingReviewWikitext(chapters, {
            articleTitle,
            revisionId,
            revisionTimestamp,
        }).trim();
        await copyText(
            hasCopiedReview(historyKey)
                ? reviewText
                : `${reviewIntroduction}\n\n${reviewText}`,
        );
        rememberCopiedReview(historyKey);
        mw.notify(
            state.convByVar({
                hant: '已複製評審文字，可貼到目標頁面。',
                hans: '已复制评审文本，可粘贴到目标页面。',
            }),
            { tag: 'review-tool' },
        );
        return true;
    } catch (error) {
        console.error('[ReviewTool] Failed to copy review text', error);
        mw.notify(
            state.convByVar({
                hant: '無法複製評審文字，請檢查網路連線及剪貼簿權限後重試。',
                hans: '无法复制评审文本，请检查网络连接及剪贴板权限后重试。',
            }),
            { type: 'error', tag: 'review-tool' },
        );
        return false;
    }
}

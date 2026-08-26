import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scoreboardSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), './DomainScoreboard.tsx'),
    'utf8'
);

const trackUtilSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../utils/matrixTabletScoreTrack.ts'),
    'utf8'
);

/** §2.3.4: ≥94px content after px-2 (16px) padding. */
const DESKTOP_SCORE_COLUMN_FLOOR_PX = 110;
const DESKTOP_SCORE_COLUMN_PREFERRED_PX = 260;

describe('DomainScoreboard Approach C layout (§2.3)', () => {
    it('derives tablet track width from domain scales rather than a fixed 244 constant', () => {
        expect(scoreboardSource).toContain('resolveTabletScoreTrackLayout');
        expect(scoreboardSource).not.toContain('TABLET_SCORE_TRACK_MIN_PX = 244');
        expect(scoreboardSource).toContain('data-matrix-tablet-score-track-width');
        expect(scoreboardSource).toMatch(
            /renderTabletTargetRow[\s\S]*data-matrix-tablet-target-row[\s\S]*data-matrix-tablet-score-track[\s\S]*View/
        );
        expect(scoreboardSource).toContain('lg:hidden');
        expect(scoreboardSource).toContain('truncate');
    });

    it('defines wrap layout when identity would fall below the minimum width floor', () => {
        expect(scoreboardSource).toContain('data-matrix-tablet-score-wrap');
        expect(scoreboardSource).toContain('allowWrap');
        expect(trackUtilSource).toContain('MIN_TABLET_IDENTITY_WIDTH_PX');
        expect(trackUtilSource).toContain('shouldUseTabletScoreWrapLayout');
    });

    it('applies a desktop score-column floor so 44px controls do not reflow at two pixels', () => {
        expect(scoreboardSource).toContain('data-matrix-desktop-score-column');
        expect(scoreboardSource).toContain('data-matrix-desktop-score-cell');
        expect(scoreboardSource).toContain(`DESKTOP_SCORE_COLUMN_FLOOR_PX = ${DESKTOP_SCORE_COLUMN_FLOOR_PX}`);
        expect(scoreboardSource).toContain(
            `DESKTOP_SCORE_COLUMN_PREFERRED_PX = ${DESKTOP_SCORE_COLUMN_PREFERRED_PX}`
        );
        expect(scoreboardSource).toMatch(
            /renderDesktopTargetRow[\s\S]*className="px-2 py-4"[\s\S]*data-matrix-desktop-score-cell/
        );
        expect(DESKTOP_SCORE_COLUMN_FLOOR_PX - 16).toBeGreaterThanOrEqual(94);
    });

    it('keeps desktop table separate from the tablet row layout', () => {
        expect(scoreboardSource).toMatch(/hidden w-full text-left lg:table/);
        expect(scoreboardSource).toContain('data-matrix-tablet-scoreboard');
    });
});

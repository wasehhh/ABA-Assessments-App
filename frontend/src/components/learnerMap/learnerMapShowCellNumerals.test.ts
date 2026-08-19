import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LearnerMapCell as LearnerMapCellData } from '../../services/learnerMapProfile';
import { SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX } from '../assessmentSnapshot/v1/snapshotShowScores';
import { learnerMapFullExportAckStorageKey } from './export/learnerMapExportAcknowledgment';
import { LearnerMapCell } from './LearnerMapCell';
import { LearnerMapShowCellNumeralsToggle } from './LearnerMapShowCellNumeralsToggle';
import { LearnerMapView } from './LearnerMapView';
import { movementMarkerSymbol } from './movementDisplay';
import {
    LEARNER_MAP_SHOW_CELL_NUMERALS_STORAGE_PREFIX,
    learnerMapShowCellNumeralsStorageKey,
    readLearnerMapShowCellNumerals,
    writeLearnerMapShowCellNumerals,
} from './learnerMapShowCellNumerals';
import { buildLearnerMapProfile } from '../../services/learnerMapProfile';
import { ContentPackData } from '../../types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function createSessionStorageMock(): Storage {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
}

function makeCell(overrides: Partial<LearnerMapCellData> = {}): LearnerMapCellData {
    return {
        cycleId: 'c1',
        cycleNumber: 1,
        rawScore: 2,
        displayScoreWithMax: '2/4',
        competencyState: 'in_progress',
        normalizedRatio: 0.5,
        isUnscored: false,
        movementFromPrevious: 'up',
        ...overrides,
    };
}

function renderGridCell(showCellNumerals: boolean, cell = makeCell()) {
    return renderToStaticMarkup(
        createElement(
            'div',
            {
                'data-learner-map-show-cell-numerals': showCellNumerals ? 'true' : 'false',
            },
            createElement(LearnerMapCell, { cell })
        )
    );
}

function makeMinimalProfile() {
    const pack: ContentPackData = {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Pack',
        description: '',
        version: '1',
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'T1',
                        title: 'Target 1',
                        success_criteria: '',
                        materials: '',
                        scoring: {
                            type: 'numeric',
                            scale: [0, 1, 2],
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        },
                    },
                ],
            },
        ],
    };

    return buildLearnerMapProfile({
        assessment: { id: 'assess-1', pack_snapshot: pack },
        cycles: [
            {
                cycle: { id: 'c1', cycle_number: 1, status: 'closed' },
                scores: [],
            },
        ],
        generatedAt: new Date('2026-07-06T12:00:00.000Z'),
    });
}

describe('learnerMapShowCellNumerals storage', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('defaults to hiding numerals and uses learner-map-show-cell-numerals: per assessment', () => {
        expect(learnerMapShowCellNumeralsStorageKey('assess-A')).toBe(
            `${LEARNER_MAP_SHOW_CELL_NUMERALS_STORAGE_PREFIX}assess-A`
        );
        expect(readLearnerMapShowCellNumerals('assess-A')).toBe(false);
        expect(readLearnerMapShowCellNumerals('assess-B')).toBe(false);
    });

    it('does not collide with Snapshot numerals or export acknowledgement keys', () => {
        expect(LEARNER_MAP_SHOW_CELL_NUMERALS_STORAGE_PREFIX).not.toBe(
            SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX
        );
        expect(learnerMapShowCellNumeralsStorageKey('assess-1')).not.toBe(
            `${SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX}assess-1`
        );
        expect(learnerMapShowCellNumeralsStorageKey('assess-1')).not.toBe(
            learnerMapFullExportAckStorageKey('assess-1')
        );
    });

    it('persists the choice per assessment so export can read the same preference', () => {
        writeLearnerMapShowCellNumerals('assess-A', true);
        expect(readLearnerMapShowCellNumerals('assess-A')).toBe(true);
        expect(readLearnerMapShowCellNumerals('assess-B')).toBe(false);

        writeLearnerMapShowCellNumerals('assess-A', false);
        expect(readLearnerMapShowCellNumerals('assess-A')).toBe(false);
        expect(sessionStorage.getItem(learnerMapShowCellNumeralsStorageKey('assess-A'))).toBe('0');
    });

    it('treats unavailable sessionStorage as the default (numerals hidden)', () => {
        vi.stubGlobal('sessionStorage', {
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('denied');
            },
            removeItem: () => undefined,
            clear: () => undefined,
            key: () => null,
            length: 0,
        } satisfies Storage);

        writeLearnerMapShowCellNumerals('assess-9', true);
        expect(readLearnerMapShowCellNumerals('assess-9')).toBe(false);
    });
});

describe('Learner Map cell numeral visibility', () => {
    it('checkbox defaults to unchecked and is labelled Show cell numerals', () => {
        const checked = renderToStaticMarkup(
            createElement(LearnerMapShowCellNumeralsToggle, {
                checked: true,
                onChange: () => undefined,
            })
        );
        const unchecked = renderToStaticMarkup(
            createElement(LearnerMapShowCellNumeralsToggle, {
                checked: false,
                onChange: () => undefined,
            })
        );

        expect(checked).toContain('Show cell numerals');
        expect(checked).toContain('checked');
        expect(unchecked).toContain('Show cell numerals');
        expect(unchecked).not.toContain('checked');
    });

    it('keeps aria-label and inner numeral text identical apart from the styling hook', () => {
        const shown = renderGridCell(true);
        const hidden = renderGridCell(false);

        const normalize = (markup: string) =>
            markup.replace(/data-learner-map-show-cell-numerals="(?:true|false)"/, 'HOOK');

        expect(normalize(shown)).toBe(normalize(hidden));
        expect(hidden).toContain('score 2/4');
        expect(hidden).toContain('Improved');
        expect(hidden).toMatch(/>2\/4</);
        expect(hidden).toContain('data-learner-map-cell-numeral');
    });

    it('uses CSS to suppress numerals by default and reveals on hover or focus', () => {
        const indexCss = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
        expect(indexCss).toMatch(
            /\[data-learner-map-show-cell-numerals='false'\] \[data-learner-map-grid-cell\]:not\(:hover\):not\(:focus\):not\(:focus-visible\) \[data-learner-map-cell-numeral\]/
        );

        const printBlock = indexCss.slice(indexCss.lastIndexOf('@media print'));
        expect(printBlock).toMatch(
            /\[data-learner-map-show-cell-numerals='false'\] \[data-learner-map-grid-cell\] \[data-learner-map-cell-numeral\]/
        );
        expect(printBlock).toMatch(/color:\s*transparent\s*!important/);
    });

    it('LearnerMapView carries the preference hook for screen and export surfaces', () => {
        const profile = makeMinimalProfile();
        const hidden = renderToStaticMarkup(
            createElement(LearnerMapView, {
                profile,
                showCellNumerals: false,
            })
        );
        const shown = renderToStaticMarkup(
            createElement(LearnerMapView, {
                profile,
                showCellNumerals: true,
            })
        );

        expect(hidden).toContain('data-learner-map-show-cell-numerals="false"');
        expect(shown).toContain('data-learner-map-show-cell-numerals="true"');
        expect(hidden).toContain('Cell numerals visually suppressed');
        expect(shown).not.toContain('Cell numerals visually suppressed');
    });
});

describe('Learner Map movement markers in grid cells', () => {
    it('renders + for newly scored targets and no marker for none', () => {
        expect(movementMarkerSymbol('new')).toBe('+');

        const newCell = renderToStaticMarkup(
            createElement(LearnerMapCell, {
                cell: makeCell({ movementFromPrevious: 'new' }),
            })
        );
        expect(newCell).toContain('>+</');

        const noneCell = renderToStaticMarkup(
            createElement(LearnerMapCell, {
                cell: makeCell({ movementFromPrevious: 'none' }),
            })
        );
        expect(noneCell).not.toContain('>↑<');
        expect(noneCell).not.toContain('>↓<');
        expect(noneCell).not.toContain('>=<');
        expect(noneCell).not.toContain('>+<');
        expect(noneCell).not.toContain('>–<');
    });
});

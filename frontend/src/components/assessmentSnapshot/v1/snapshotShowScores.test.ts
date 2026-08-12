import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LearnerMapCell } from '../../../services/learnerMapProfile';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import { buildPrintRenderPlan } from '../../../utils/snapshotPrintRenderPlan';
import { PrintDocumentFooter } from '../print/PrintDocumentFooter';
import { AssessmentSnapshotPrintDocument } from '../print/AssessmentSnapshotPrintDocument';
import { EvidenceBead } from './EvidenceBead';
import { SnapshotShowScoresToggle } from './SnapshotShowScoresToggle';
import { AssessmentSnapshotScreenDocument } from './AssessmentSnapshotScreenDocument';
import { AssessmentSnapshotThreadsLegend } from './AssessmentSnapshotThreadsLegend';
import {
    readSnapshotShowScores,
    SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX,
    snapshotShowScoresStorageKey,
    writeSnapshotShowScores,
} from './snapshotShowScores';
import {
    resolveSnapshotLegendCopy,
    SNAPSHOT_LEGEND_SCORE_HINT,
    SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN,
} from './snapshotVisualSystem';
import { resolveThreadsLayoutFromPlan } from './threadsLayout';

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

const generatedAt = new Date('2026-07-06T12:00:00.000Z');
const generatedAtLabel = 'Jul 6, 2026, 8:00 AM';

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: overrides.title ?? overrides.target_id,
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        ...overrides,
    };
}

function makeProfile() {
    const pack: ContentPackData = {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Alpha Pack',
        description: '',
        version: '2.1',
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    makeTarget({ target_id: 'A1' }),
                    makeTarget({ target_id: 'A2' }),
                ],
            },
        ],
    };

    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: pack },
            cycles: [
                {
                    cycle: { id: 'c1', cycle_number: 1, status: 'closed' },
                    scores: [
                        {
                            id: 's1',
                            assessment_id: 'assess-1',
                            assessment_cycle_id: 'c1',
                            client_id: 'cl',
                            pack_snapshot_id: 'p',
                            target_id: 'A1',
                            domain_id: 'A',
                            score: 2,
                            note: null,
                            evidence_files: [],
                            assessor_user_id: 'u',
                            scored_at: '',
                            created_at: '',
                            updated_at: '',
                        },
                    ],
                },
                { cycle: { id: 'c2', cycle_number: 2, status: 'closed' }, scores: [] },
            ],
            generatedAt,
        })
    );
}

function makeCell(overrides: Partial<LearnerMapCell> = {}): LearnerMapCell {
    return {
        cycleId: 'c1',
        cycleNumber: 1,
        rawScore: 2,
        displayScoreWithMax: '2/4',
        competencyState: 'in_progress',
        normalizedRatio: 0.5,
        isUnscored: false,
        movementFromPrevious: 'none',
        ...overrides,
    };
}

function renderBead(showScores: boolean): string {
    const layout = resolveThreadsLayoutFromPlan({
        tier: 'standard',
        domainColumnWidthRem: 12,
        mode: 'screen',
    });

    return renderToStaticMarkup(
        createElement(
            'div',
            { 'data-assessment-snapshot-show-scores': showScores ? 'true' : 'false' },
            createElement(EvidenceBead, {
                cell: makeCell(),
                cycle: { cycleId: 'c1', cycleNumber: 1, cycleStatus: 'closed' },
                targetTitle: 'Mand 1',
                targetId: 'A1',
                isLatestCycle: true,
                layout,
            })
        )
    );
}

function listProductionSourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (entry === 'node_modules' || entry === 'dist') continue;
            out.push(...listProductionSourceFiles(full));
            continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        if (/\.test\.(ts|tsx)$/.test(entry)) continue;
        out.push(full);
    }
    return out;
}

describe('snapshot show-scores storage', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('defaults to showing scores and uses snapshot-show-scores: per assessment', () => {
        expect(snapshotShowScoresStorageKey('assess-A')).toBe(
            `${SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX}assess-A`
        );
        expect(readSnapshotShowScores('assess-A')).toBe(true);
        expect(readSnapshotShowScores('assess-B')).toBe(true);
    });

    it('persists the choice per assessment so A does not affect B', () => {
        writeSnapshotShowScores('assess-A', false);
        expect(readSnapshotShowScores('assess-A')).toBe(false);
        expect(readSnapshotShowScores('assess-B')).toBe(true);

        writeSnapshotShowScores('assess-A', true);
        expect(readSnapshotShowScores('assess-A')).toBe(true);
        expect(sessionStorage.getItem(snapshotShowScoresStorageKey('assess-A'))).toBe('1');
    });

    it('treats unavailable sessionStorage as the default (scores shown)', () => {
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

        writeSnapshotShowScores('assess-9', false);
        expect(readSnapshotShowScores('assess-9')).toBe(true);
    });
});

describe('snapshot show-scores UI and documents', () => {
    it('checkbox defaults to checked and labelled Show bead numerals', () => {
        const checked = renderToStaticMarkup(
            createElement(SnapshotShowScoresToggle, { checked: true, onChange: () => undefined })
        );
        const unchecked = renderToStaticMarkup(
            createElement(SnapshotShowScoresToggle, { checked: false, onChange: () => undefined })
        );

        expect(checked).toContain('Show bead numerals');
        expect(checked).toContain('checked');
        expect(unchecked).toContain('Show bead numerals');
        expect(unchecked).not.toContain('checked');
    });

    it('accessible name and data-raw-score carry the score in both numeral states', () => {
        const shown = renderBead(true);
        const hidden = renderBead(false);
        const shownAria = shown.match(/aria-label="([^"]+)"/)?.[1];
        const hiddenAria = hidden.match(/aria-label="([^"]+)"/)?.[1];
        const shownTitle = shown.match(/title="([^"]+)"/)?.[1];
        const hiddenTitle = hidden.match(/title="([^"]+)"/)?.[1];

        expect(shownAria).toBe(hiddenAria);
        expect(shownTitle).toBe(hiddenTitle);
        expect(hiddenAria).toContain('2/4');
        expect(hiddenAria).toContain('Mand 1');
        expect(hidden).toContain('data-raw-score="2"');
        expect(shown).toContain('data-raw-score="2"');
        expect(hidden).toMatch(/>2</);
        expect(shown).toMatch(/>2</);
    });

    it('hover and keyboard focus both reveal hidden numerals; print keeps them hidden', () => {
        const indexCss = readFileSync(resolve(__dirname, '../../../index.css'), 'utf8');
        const screenRule =
            /\[data-assessment-snapshot-show-scores='false'\] \[data-assessment-snapshot-evidence-bead\]:not\(:hover\):not\(:focus\):not\(:focus-visible\)/;
        expect(indexCss).toMatch(screenRule);
        expect(indexCss).toMatch(/:not\(:hover\)/);
        expect(indexCss).toMatch(/:not\(:focus\)/);
        expect(indexCss).toMatch(/:not\(:focus-visible\)/);

        const printBlock = indexCss.slice(indexCss.lastIndexOf('@media print'));
        expect(printBlock).toMatch(
            /\[data-assessment-snapshot-show-scores='false'\] \[data-assessment-snapshot-evidence-bead\]:focus/
        );
        expect(printBlock).toMatch(
            /\[data-assessment-snapshot-show-scores='false'\] \[data-assessment-snapshot-evidence-bead\]:focus-visible/
        );
        expect(printBlock).toMatch(
            /\[data-assessment-snapshot-show-scores='false'\] \[data-assessment-snapshot-evidence-bead\]:hover/
        );
        expect(printBlock).toMatch(/color:\s*transparent\s*!important/);
    });

    it('legend hint reflects the active state from snapshotVisualSystem SSOT', () => {
        expect(resolveSnapshotLegendCopy().scoreHint).toBe(SNAPSHOT_LEGEND_SCORE_HINT);
        expect(resolveSnapshotLegendCopy({ showScores: true }).scoreHint).toBe(
            SNAPSHOT_LEGEND_SCORE_HINT
        );
        expect(resolveSnapshotLegendCopy({ showScores: false }).scoreHint).toBe(
            SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN
        );

        const shownLegend = renderToStaticMarkup(
            createElement(AssessmentSnapshotThreadsLegend, { showScores: true })
        );
        const hiddenLegend = renderToStaticMarkup(
            createElement(AssessmentSnapshotThreadsLegend, { showScores: false })
        );
        expect(shownLegend).toContain(SNAPSHOT_LEGEND_SCORE_HINT);
        expect(shownLegend).not.toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
        expect(hiddenLegend).toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
        expect(hiddenLegend).not.toContain(SNAPSHOT_LEGEND_SCORE_HINT);
    });

    it('does not restate legend score hints outside snapshotVisualSystem.ts', () => {
        const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
        const legendSsot = 'components/assessmentSnapshot/v1/snapshotVisualSystem.ts';
        const checkboxSsot = 'components/assessmentSnapshot/v1/SnapshotShowScoresToggle.tsx';
        const checkboxLabel = 'Show bead numerals';
        const offenders: string[] = [];
        const checkboxDefinitions: string[] = [];

        for (const file of listProductionSourceFiles(srcRoot)) {
            const rel = relative(srcRoot, file).replace(/\\/g, '/');
            const src = readFileSync(file, 'utf8');
            if (rel !== legendSsot) {
                if (src.includes(`'${SNAPSHOT_LEGEND_SCORE_HINT}'`) || src.includes(`"${SNAPSHOT_LEGEND_SCORE_HINT}"`)) {
                    offenders.push(`${rel} restates SNAPSHOT_LEGEND_SCORE_HINT`);
                }
                if (
                    src.includes(`'${SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN}'`) ||
                    src.includes(`"${SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN}"`)
                ) {
                    offenders.push(`${rel} restates SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN`);
                }
            }
            if (src.includes(checkboxLabel)) {
                checkboxDefinitions.push(rel);
            }
        }

        expect(offenders).toEqual([]);
        expect(checkboxDefinitions).toEqual([checkboxSsot]);
    });

    it('screen and print documents honour both states and state suppression when hidden', () => {
        const profile = makeProfile();
        const plan = buildPrintRenderPlan(profile, { paper: 'letter' });

        const shownScreen = renderToStaticMarkup(
            createElement(AssessmentSnapshotScreenDocument, {
                profile,
                generatedAtLabel,
                showScores: true,
            })
        );
        const hiddenScreen = renderToStaticMarkup(
            createElement(AssessmentSnapshotScreenDocument, {
                profile,
                generatedAtLabel,
                showScores: false,
            })
        );
        const shownPrint = renderToStaticMarkup(
            createElement(AssessmentSnapshotPrintDocument, {
                profile,
                plan,
                generatedAtLabel,
                showScores: true,
            })
        );
        const hiddenPrint = renderToStaticMarkup(
            createElement(AssessmentSnapshotPrintDocument, {
                profile,
                plan,
                generatedAtLabel,
                showScores: false,
            })
        );

        expect(shownScreen).toContain('data-assessment-snapshot-show-scores="true"');
        expect(hiddenScreen).toContain('data-assessment-snapshot-show-scores="false"');
        expect(shownPrint).toContain('data-assessment-snapshot-show-scores="true"');
        expect(hiddenPrint).toContain('data-assessment-snapshot-show-scores="false"');

        expect(hiddenScreen).toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
        expect(hiddenScreen).toContain('data-assessment-snapshot-numerals-hidden');
        expect(shownScreen).not.toContain('data-assessment-snapshot-numerals-hidden');
        expect(hiddenPrint).toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
        expect(hiddenPrint).toContain('data-assessment-snapshot-numerals-hidden');
        expect(shownPrint).not.toContain('data-assessment-snapshot-numerals-hidden');

        const count = (markup: string, token: string) => markup.split(token).length - 1;
        expect(count(hiddenScreen, 'data-assessment-snapshot-target-thread')).toBe(
            count(shownScreen, 'data-assessment-snapshot-target-thread')
        );
        expect(count(hiddenScreen, 'data-assessment-snapshot-evidence-bead')).toBe(
            count(shownScreen, 'data-assessment-snapshot-evidence-bead')
        );
        expect(count(hiddenPrint, 'data-assessment-snapshot-target-thread')).toBe(
            count(shownPrint, 'data-assessment-snapshot-target-thread')
        );
        expect(count(hiddenPrint, 'data-assessment-snapshot-evidence-bead')).toBe(
            count(shownPrint, 'data-assessment-snapshot-evidence-bead')
        );
        expect(count(shownScreen, 'data-assessment-snapshot-target-thread')).toBe(2);
        expect(count(shownScreen, 'data-assessment-snapshot-evidence-bead')).toBe(4);
    });

    it('print footer omits the suppression line when numerals are shown', () => {
        const profile = makeProfile();
        const shown = renderToStaticMarkup(
            createElement(PrintDocumentFooter, {
                profile,
                generatedAtLabel,
                pageNumber: 1,
                totalPages: 1,
                showScores: true,
            })
        );
        const hidden = renderToStaticMarkup(
            createElement(PrintDocumentFooter, {
                profile,
                generatedAtLabel,
                pageNumber: 1,
                totalPages: 1,
                showScores: false,
            })
        );

        expect(shown).not.toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
        expect(hidden).toContain(SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN);
    });
});

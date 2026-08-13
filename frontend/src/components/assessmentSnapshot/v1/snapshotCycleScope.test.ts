import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import { buildPrintRenderPlan } from '../../../utils/snapshotPrintRenderPlan';
import { AssessmentSnapshotPrintDocument } from '../print/AssessmentSnapshotPrintDocument';
import { AssessmentSnapshotScreenDocument } from './AssessmentSnapshotScreenDocument';
import { applyCycleScopeToProfile } from './applyCycleScope';
import {
    formatCycleScopeLineValue,
    isPartialCycleScope,
    normalizeScopeForWrite,
    readSnapshotCycleScope,
    recentPresetScope,
    resolveIncludedCycleIds,
    scopeFromExplicitSelection,
    SNAPSHOT_CYCLE_SCOPE_COMPLETE,
    SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX,
    SNAPSHOT_RECENT_PRESET_N,
    snapshotCycleScopeStorageKey,
    writeSnapshotCycleScope,
} from './snapshotCycleScope';
import {
    buildSnapshotExportFilename,
    buildSnapshotExportHtml,
} from '../export/snapshotExportHtml';

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

function makeProfile(cycleCount: number) {
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
                targets: [makeTarget({ target_id: 'A1' }), makeTarget({ target_id: 'A2' })],
            },
        ],
    };

    const cycles = Array.from({ length: cycleCount }, (_, index) => {
        const n = index + 1;
        return {
            cycle: { id: `c${n}`, cycle_number: n, status: 'closed' as const },
            scores:
                n === 1
                    ? [
                          {
                              id: 's1',
                              assessment_id: 'assess-1',
                              assessment_cycle_id: `c${n}`,
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
                      ]
                    : n === 4
                      ? [
                            {
                                id: 's4',
                                assessment_id: 'assess-1',
                                assessment_cycle_id: `c${n}`,
                                client_id: 'cl',
                                pack_snapshot_id: 'p',
                                target_id: 'A1',
                                domain_id: 'A',
                                score: 3,
                                note: null,
                                evidence_files: [],
                                assessor_user_id: 'u',
                                scored_at: '',
                                created_at: '',
                                updated_at: '',
                            },
                        ]
                      : [],
        };
    });

    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: pack },
            cycles,
            generatedAt,
        })
    );
}

describe('snapshotCycleScope storage and resolution', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('defaults to complete and uses a non-colliding storage prefix', () => {
        expect(snapshotCycleScopeStorageKey('a1')).toBe(
            `${SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX}a1`
        );
        expect(SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX).not.toContain('show-scores');
        expect(SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX).not.toContain('export-ack');
        expect(readSnapshotCycleScope('a1')).toEqual(SNAPSHOT_CYCLE_SCOPE_COMPLETE);
    });

    it('persists complete, explicit cycles, and sticky recent independently per assessment', () => {
        writeSnapshotCycleScope('assess-A', { kind: 'cycles', cycleIds: ['c1', 'c4'] });
        writeSnapshotCycleScope('assess-B', recentPresetScope());
        expect(readSnapshotCycleScope('assess-A')).toEqual({
            kind: 'cycles',
            cycleIds: ['c1', 'c4'],
        });
        expect(readSnapshotCycleScope('assess-B')).toEqual({
            kind: 'recent',
            n: SNAPSHOT_RECENT_PRESET_N,
        });
        expect(readSnapshotCycleScope('assess-C')).toEqual(SNAPSHOT_CYCLE_SCOPE_COMPLETE);
    });

    it('treats storage failure as complete', () => {
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

        writeSnapshotCycleScope('assess-9', { kind: 'cycles', cycleIds: ['c1'] });
        expect(readSnapshotCycleScope('assess-9')).toEqual(SNAPSHOT_CYCLE_SCOPE_COMPLETE);
    });

    it('fails empty selection closed to complete', () => {
        expect(normalizeScopeForWrite({ kind: 'cycles', cycleIds: [] })).toEqual(
            SNAPSHOT_CYCLE_SCOPE_COMPLETE
        );
        expect(scopeFromExplicitSelection([], [{ cycleId: 'c1' }, { cycleId: 'c2' }])).toEqual(
            SNAPSHOT_CYCLE_SCOPE_COMPLETE
        );
    });

    it('complete absorbs new cycles; explicit ids do not; sticky recent recomputes', () => {
        const four = [
            { cycleId: 'c1' },
            { cycleId: 'c2' },
            { cycleId: 'c3' },
            { cycleId: 'c4' },
        ];
        const five = [...four, { cycleId: 'c5' }];

        expect(resolveIncludedCycleIds({ kind: 'complete' }, four)).toEqual([
            'c1',
            'c2',
            'c3',
            'c4',
        ]);
        expect(resolveIncludedCycleIds({ kind: 'complete' }, five)).toEqual([
            'c1',
            'c2',
            'c3',
            'c4',
            'c5',
        ]);

        const explicit = { kind: 'cycles' as const, cycleIds: ['c1', 'c4'] };
        expect(resolveIncludedCycleIds(explicit, four)).toEqual(['c1', 'c4']);
        expect(resolveIncludedCycleIds(explicit, five)).toEqual(['c1', 'c4']);

        expect(resolveIncludedCycleIds(recentPresetScope(), four)).toEqual([
            'c2',
            'c3',
            'c4',
        ]);
        expect(resolveIncludedCycleIds(recentPresetScope(), five)).toEqual([
            'c3',
            'c4',
            'c5',
        ]);
    });
});

describe('cycle scope line grammar (§5.1)', () => {
    it('formats complete, contiguous, non-contiguous, and single-cycle values without ranges', () => {
        expect(
            formatCycleScopeLineValue(
                [{ cycleNumber: 1 }, { cycleNumber: 2 }, { cycleNumber: 3 }],
                3
            )
        ).toBe('3');
        expect(
            formatCycleScopeLineValue([{ cycleNumber: 1 }, { cycleNumber: 2 }], 6)
        ).toBe('C1, C2 of 6');
        expect(
            formatCycleScopeLineValue([{ cycleNumber: 4 }, { cycleNumber: 1 }], 6)
        ).toBe('C1, C4 of 6');
        expect(formatCycleScopeLineValue([{ cycleNumber: 3 }], 6)).toBe('C3 of 6');

        const values = [
            formatCycleScopeLineValue([{ cycleNumber: 1 }, { cycleNumber: 2 }], 6),
            formatCycleScopeLineValue([{ cycleNumber: 1 }, { cycleNumber: 4 }], 6),
            formatCycleScopeLineValue([{ cycleNumber: 3 }], 6),
        ];
        for (const value of values) {
            expect(value).not.toMatch(/C\d+[–-]/);
            expect(value).not.toContain('–');
        }
    });
});

describe('structural cycle omission', () => {
    it('removes non-selected cycle scores from screen HTML and print trees', () => {
        const full = makeProfile(6);
        const includedIds = resolveIncludedCycleIds(
            { kind: 'cycles', cycleIds: ['c1', 'c4'] },
            full.cycles
        );
        const scoped = applyCycleScopeToProfile(full, includedIds);
        expect(scoped.cycles.map((c) => c.cycleId)).toEqual(['c1', 'c4']);
        expect(scoped.domains[0].targets).toHaveLength(2);
        for (const target of scoped.domains[0].targets) {
            expect(target.cells.every((cell) => cell.cycleId === 'c1' || cell.cycleId === 'c4')).toBe(
                true
            );
            expect(target.cells.some((cell) => cell.cycleId === 'c2')).toBe(false);
        }

        const screen = renderToStaticMarkup(
            createElement(AssessmentSnapshotScreenDocument, {
                profile: scoped,
                generatedAtLabel: 'Jul 6, 2026',
                assessmentCycleCount: 6,
            })
        );
        const plan = buildPrintRenderPlan(scoped, { paper: 'letter' });
        const print = renderToStaticMarkup(
            createElement(AssessmentSnapshotPrintDocument, {
                profile: scoped,
                plan,
                generatedAtLabel: 'Jul 6, 2026',
                assessmentCycleCount: 6,
            })
        );

        for (const markup of [screen, print]) {
            expect(markup).toContain('data-cycle-id="c1"');
            expect(markup).toContain('data-cycle-id="c4"');
            expect(markup).not.toContain('data-cycle-id="c2"');
            expect(markup).not.toContain('data-cycle-id="c3"');
            expect(markup).not.toContain('data-cycle-id="c5"');
            expect(markup).not.toContain('data-cycle-id="c6"');
            expect(markup).toContain('C1, C4 of 6');
            expect(markup).not.toMatch(/C1[–-]C4/);
        }

        const html = buildSnapshotExportHtml({
            profile: scoped,
            generatedAt,
            assessmentCycleCount: 6,
            isPartialCycleScope: true,
        });
        const degraded = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
        expect(degraded).toContain('C1, C4 of 6');
        expect(degraded).toContain('data-assessment-snapshot-cycle-scope');
        expect(degraded).not.toContain('data-cycle-id="c2"');
        expect(html).toContain('<title>Assessment Snapshot Export — partial</title>');
        expect(
            buildSnapshotExportFilename('assess-1', generatedAt, { isPartialCycleScope: true })
        ).toBe('assessment-snapshot-partial-assess-1-2026-07-06.html');
        expect(buildSnapshotExportFilename('assess-1', generatedAt)).toBe(
            'assessment-snapshot-assess-1-2026-07-06.html'
        );
    });

    it('keeps included bead labels byte-identical to complete-scope output for the same cycles', () => {
        const full = makeProfile(6);
        const completeHtml = buildSnapshotExportHtml({
            profile: full,
            generatedAt,
            assessmentCycleCount: 6,
        });
        const scoped = applyCycleScopeToProfile(full, ['c1', 'c4']);
        const partialHtml = buildSnapshotExportHtml({
            profile: scoped,
            generatedAt,
            assessmentCycleCount: 6,
            isPartialCycleScope: true,
        });

        const beadMeaning = (html: string, cycleId: string) =>
            [...html.matchAll(
                new RegExp(
                    `data-assessment-snapshot-evidence-bead[^>]*data-cycle-id="${cycleId}"[^>]*data-raw-score="([^"]*)"[^>]*aria-label="([^"]*)"`,
                    'g'
                )
            )].map((match) => ({ raw: match[1], aria: match[2] }));

        const completeC1 = beadMeaning(completeHtml, 'c1');
        const partialC1 = beadMeaning(partialHtml, 'c1');
        const completeC4 = beadMeaning(completeHtml, 'c4');
        const partialC4 = beadMeaning(partialHtml, 'c4');

        expect(partialC1.length).toBeGreaterThan(0);
        expect(partialC1).toEqual(completeC1);
        expect(partialC4).toEqual(completeC4);
        expect(isPartialCycleScope(['c1', 'c4'], 6)).toBe(true);
        expect(isPartialCycleScope(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], 6)).toBe(false);
    });

    it('does not show an unqualified included-only cycle count under partial scope', () => {
        const full = makeProfile(6);
        const scoped = applyCycleScopeToProfile(full, ['c1', 'c4']);
        const screen = renderToStaticMarkup(
            createElement(AssessmentSnapshotScreenDocument, {
                profile: scoped,
                generatedAtLabel: 'Jul 6, 2026',
                assessmentCycleCount: 6,
            })
        );
        const plan = buildPrintRenderPlan(scoped, { paper: 'letter' });
        const print = renderToStaticMarkup(
            createElement(AssessmentSnapshotPrintDocument, {
                profile: scoped,
                plan,
                generatedAtLabel: 'Jul 6, 2026',
                assessmentCycleCount: 6,
            })
        );
        const html = buildSnapshotExportHtml({
            profile: scoped,
            generatedAt,
            assessmentCycleCount: 6,
            isPartialCycleScope: true,
        });

        // Known cycle-count chrome sites (explicit inventory — not a whole-repo scanner).
        // If you add a new data-assessment-snapshot-*cycle*count*|cycle-scope* chrome
        // hook that displays a count, add it here and assert partial grammar.
        const KNOWN_CYCLE_COUNT_CHROME_ATTRS = [
            'data-assessment-snapshot-cycle-scope',
            'data-assessment-snapshot-cycle-scope-footer',
            'data-assessment-snapshot-print-cycle-count',
        ] as const;

        const chromeSourceFiles = [
            resolve(
                __dirname,
                '../AssessmentSnapshotHeader.tsx'
            ),
            resolve(__dirname, './AssessmentSnapshotThreadsFooter.tsx'),
            resolve(__dirname, '../print/PrintDocumentHeader.tsx'),
            resolve(__dirname, '../print/PrintDocumentFooter.tsx'),
        ];
        const foundChromeAttrs = new Set<string>();
        const attrPattern =
            /data-assessment-snapshot-(?:[a-z0-9-]*cycle-scope[a-z0-9-]*|[a-z0-9-]*cycle-count[a-z0-9-]*)/g;
        for (const filePath of chromeSourceFiles) {
            const source = readFileSync(filePath, 'utf8');
            for (const match of source.matchAll(attrPattern)) {
                foundChromeAttrs.add(match[0]);
            }
        }
        expect([...foundChromeAttrs].sort()).toEqual([...KNOWN_CYCLE_COUNT_CHROME_ATTRS].sort());

        for (const markup of [screen, print, html]) {
            expect(markup).toContain('C1, C4 of 6');
            // Bare included-only count form — must not appear anywhere under partial.
            expect(markup).not.toMatch(/>\s*2 cycles?\s*</);
        }

        expect(screen).toMatch(
            /data-assessment-snapshot-cycle-scope-footer[^>]*>\s*C1, C4 of 6\s*</
        );
        expect(print).toMatch(
            /data-assessment-snapshot-print-cycle-count[^>]*>\s*C1, C4 of 6\s*</
        );
        expect(screen).toMatch(
            /data-assessment-snapshot-cycle-scope[^>]*>\s*C1, C4 of 6/
        );
        expect(print).toMatch(
            /data-assessment-snapshot-cycle-scope[^>]*>\s*C1, C4 of 6/
        );
    });
});

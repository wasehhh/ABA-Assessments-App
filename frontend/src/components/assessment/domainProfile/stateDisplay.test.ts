import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    CompetencyState,
    getCompetencyStateFromEffective,
} from '../../../utils/scoreInterpretation';
import { resolveEffectiveScoring } from '../../../utils/effectiveScoring';
import { formatMatrixScoreButtonLabel } from '../../../utils/matrixDisplayHelpers';
import { ContentPackData, Target } from '../../../types';
import { StateDistribution } from '../../../services/domainProfile';
import { AssessmentSnapshotThreadsLegend } from '../../assessmentSnapshot/v1/AssessmentSnapshotThreadsLegend';
import { resolveSnapshotLegendCopy } from '../../assessmentSnapshot/v1/snapshotVisualSystem';
import { snapshotCellLabel } from '../../assessmentSnapshot/snapshotCellDisplay';
import { AssessmentSnapshotLegend } from '../../assessmentSnapshot/AssessmentSnapshotLegend';
import { LearnerMapScoreBandsCard } from '../../learnerMap/LearnerMapScoreBandsCard';
import { ReportDomainScoreDistribution } from '../../report/ReportDomainScoreDistribution';
import { ReportAssessmentScoreDistribution } from '../../report/ReportAssessmentScoreDistribution';
import { DomainStateDistribution } from './DomainStateDistribution';
import {
    competencyLegendSwatchClass,
    competencySequenceCellClass,
    STATE_BUCKET_DISPLAY,
    STATE_DISPLAY_LABELS,
} from './stateDisplay';

const CANONICAL_SEGMENT_CLASS: Record<CompetencyState, string> = {
    unscored: 'bg-gray-300',
    not_yet: 'bg-orange-500',
    in_progress: 'bg-yellow-400',
    at_maximum: 'bg-green-600',
};

const EXPECTED_VOCABULARY: Record<CompetencyState, string> = {
    unscored: 'Unscored',
    not_yet: 'Not Demonstrated',
    in_progress: 'Emerging',
    at_maximum: 'Demonstrated',
};

const INTERNAL_ENUM_KEYS: CompetencyState[] = [
    'unscored',
    'not_yet',
    'in_progress',
    'at_maximum',
];

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SSOT_RELATIVE = 'components/assessment/domainProfile/stateDisplay.ts';

/** Authored-content / out-of-scope modules may contain coincidental "Mastered" strings. */
const AUTHORED_OR_OUT_OF_SCOPE = new Set([
    'utils/assessmentPackAuthoring.ts',
    'components/AssessmentBuilder.tsx',
    'services/analytics.ts',
]);

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

describe('stateDisplay competency color helpers', () => {
    it('STATE_BUCKET_DISPLAY uses canonical segmentClass tokens', () => {
        for (const bucket of STATE_BUCKET_DISPLAY) {
            expect(bucket.segmentClass).toBe(CANONICAL_SEGMENT_CLASS[bucket.key]);
        }
    });

    it.each(Object.entries(CANONICAL_SEGMENT_CLASS) as [CompetencyState, string][])(
        'competencyLegendSwatchClass(%s) includes %s',
        (state, segmentClass) => {
            expect(competencyLegendSwatchClass(state)).toContain(segmentClass);
        }
    );

    it.each(Object.entries(CANONICAL_SEGMENT_CLASS) as [CompetencyState, string][])(
        'competencySequenceCellClass(%s) includes %s',
        (state, segmentClass) => {
            expect(competencySequenceCellClass(state)).toContain(segmentClass);
        }
    );
});

describe('competency vocabulary rename (Evalis SSOT)', () => {
    it('STATE_DISPLAY_LABELS is the sole definition of Evalis competency words', () => {
        expect(STATE_DISPLAY_LABELS).toEqual(EXPECTED_VOCABULARY);
        expect(Object.keys(STATE_DISPLAY_LABELS).sort()).toEqual([...INTERNAL_ENUM_KEYS].sort());
        for (const bucket of STATE_BUCKET_DISPLAY) {
            expect(bucket.label).toBe(STATE_DISPLAY_LABELS[bucket.key]);
        }
    });

    it('keeps Emerging and Unscored unchanged; internal enum keys unchanged', () => {
        expect(STATE_DISPLAY_LABELS.in_progress).toBe('Emerging');
        expect(STATE_DISPLAY_LABELS.unscored).toBe('Unscored');
        expect(INTERNAL_ENUM_KEYS).toEqual([
            'unscored',
            'not_yet',
            'in_progress',
            'at_maximum',
        ]);
    });

    it('INV-V9: no other production module hardcodes Evalis competency label literals', () => {
        const quotedLiterals = [
            "'Not Demonstrated'",
            '"Not Demonstrated"',
            "'Demonstrated'",
            '"Demonstrated"',
            "'Not Yet'",
            '"Not Yet"',
            "'Mastered'",
            '"Mastered"',
        ];
        const offenders: string[] = [];

        for (const file of listProductionSourceFiles(SRC_ROOT)) {
            const rel = relative(SRC_ROOT, file).replace(/\\/g, '/');
            if (rel === SSOT_RELATIVE) continue;
            if (AUTHORED_OR_OUT_OF_SCOPE.has(rel)) continue;

            const src = readFileSync(file, 'utf8');
            for (const lit of quotedLiterals) {
                if (src.includes(lit)) {
                    offenders.push(`${rel} contains ${lit}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    it('authored scale_labels "Mastered" still displays as Mastered on score controls', () => {
        const authored = { 2: 'Mastered' } as const;
        expect(formatMatrixScoreButtonLabel(2, authored)).toEqual({
            text: 'Mastered',
            title: '2 — Mastered',
        });
        expect(STATE_DISPLAY_LABELS.at_maximum).toBe('Demonstrated');
        expect(STATE_DISPLAY_LABELS.at_maximum).not.toBe(authored[2]);
    });

    it('§7 surfaces derive competency labels from STATE_DISPLAY_LABELS', () => {
        const legend = resolveSnapshotLegendCopy();
        expect(legend.states.map((s) => s.label)).toEqual([
            STATE_DISPLAY_LABELS.not_yet,
            STATE_DISPLAY_LABELS.in_progress,
            STATE_DISPLAY_LABELS.at_maximum,
            STATE_DISPLAY_LABELS.unscored,
        ]);

        expect(snapshotCellLabel('not_yet')).toBe(STATE_DISPLAY_LABELS.not_yet);
        expect(snapshotCellLabel('at_maximum')).toBe(STATE_DISPLAY_LABELS.at_maximum);
        expect(snapshotCellLabel('in_progress')).toBe(STATE_DISPLAY_LABELS.in_progress);
        expect(snapshotCellLabel('unscored')).toBe(STATE_DISPLAY_LABELS.unscored);

        const distribution: StateDistribution = {
            unscored: 1,
            not_yet: 1,
            in_progress: 1,
            at_maximum: 1,
            showsInProgressBucket: true,
        };

        const markups = [
            renderToStaticMarkup(createElement(AssessmentSnapshotThreadsLegend)),
            renderToStaticMarkup(createElement(AssessmentSnapshotLegend)),
            renderToStaticMarkup(createElement(LearnerMapScoreBandsCard)),
            renderToStaticMarkup(
                createElement(DomainStateDistribution, { distribution })
            ),
            renderToStaticMarkup(
                createElement(ReportDomainScoreDistribution, { distribution })
            ),
            renderToStaticMarkup(
                createElement(ReportAssessmentScoreDistribution, { distribution })
            ),
        ];

        for (const markup of markups) {
            expect(markup).toContain('Not Demonstrated');
            expect(markup).toContain('Emerging');
            expect(markup).toContain('Demonstrated');
            expect(markup).toContain('Unscored');
            expect(markup).not.toContain('Not Yet');
            expect(markup).not.toMatch(/>\s*Mastered\s*</);
        }
    });

    it('G8: frozen pack_snapshot scoring/state unchanged; only Evalis display text differs', () => {
        const target: Target = {
            target_id: 'F1',
            title: 'Frozen target',
            success_criteria: 'Criteria',
            materials: '',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: { 0: 'Not Yet', 1: 'Emerging', 2: 'Mastered' },
                no_opportunity_allowed: false,
            },
        };
        const frozenPack: ContentPackData = {
            pack_id: 'pack-frozen',
            org_id: 'org-1',
            title: 'Frozen',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'A', title: 'Domain A', targets: [target] }],
        };

        const effective = resolveEffectiveScoring(target, frozenPack);
        expect(effective.allowedValues).toEqual([0, 1, 2]);
        expect(effective.maxScore).toBe(2);
        expect(effective.scaleLabels).toEqual({
            0: 'Not Yet',
            1: 'Emerging',
            2: 'Mastered',
        });

        expect(getCompetencyStateFromEffective(effective, 0)).toBe('not_yet');
        expect(getCompetencyStateFromEffective(effective, 1)).toBe('in_progress');
        expect(getCompetencyStateFromEffective(effective, 2)).toBe('at_maximum');

        expect(snapshotCellLabel('not_yet')).toBe('Not Demonstrated');
        expect(snapshotCellLabel('at_maximum')).toBe('Demonstrated');
        expect(formatMatrixScoreButtonLabel(2, effective.scaleLabels).text).toBe('Mastered');
    });
});

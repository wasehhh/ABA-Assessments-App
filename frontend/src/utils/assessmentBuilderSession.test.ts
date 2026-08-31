import { afterEach, describe, expect, it, vi } from 'vitest';
import { Domain } from '../types';
import {
    PACK_BUILDER_STICKY_CHROME_SELECTOR,
    buildBuilderSessionSnapshot,
    builderIssueAnchorId,
    builderSessionSnapshotsEqual,
    focusBuilderIssueAnchor,
    measuredPackBuilderStickyHeightPx,
    revealBuilderIssueAnchor,
} from './assessmentBuilderSession';
import { NEW_PACK_DEFAULT_SCALE_CSV } from './assessmentPackCanonical';

function baseInput(overrides: Partial<Parameters<typeof buildBuilderSessionSnapshot>[0]> = {}) {
    const domains: Domain[] = [
        {
            domain_id: 'A',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'A1',
                    title: 'Target A1',
                    success_criteria: 'Criteria',
                    materials: '',
                },
            ],
        },
    ];

    return {
        title: 'Pack Title',
        description: 'Description',
        domains,
        scoringMode: 'uniform' as const,
        defaultScoring: {
            type: 'numeric' as const,
            scale: [0, 1, 2],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        defaultScale: NEW_PACK_DEFAULT_SCALE_CSV,
        globalScaleLabels: {},
        targetScaleDrafts: {},
        primaryGroupLabel: 'Domain',
        targetLabel: 'Target',
        secondaryGroupLabel: '',
        secondaryGroupingEnabled: false,
        ...overrides,
    };
}

describe('assessmentBuilderSession snapshot dirty detection', () => {
    it('mount snapshot equals itself (not dirty)', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(baseInput());
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(true);
    });

    it('detects title-only edits', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(baseInput({ title: 'Changed Title' }));
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects uncommitted Uniform defaultScale CSV edits', () => {
        const baseline = buildBuilderSessionSnapshot(
            baseInput({ defaultScale: '0,1,2,3,4' })
        );
        const current = buildBuilderSessionSnapshot(
            baseInput({ defaultScale: '0,1,2' })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects uncommitted Custom targetScaleDrafts edits', () => {
        const customDomains: Domain[] = [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'A1',
                        title: 'Target A1',
                        success_criteria: 'Criteria',
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
        ];

        const baseline = buildBuilderSessionSnapshot(
            baseInput({
                scoringMode: 'custom',
                domains: customDomains,
                defaultScoring: {
                    type: 'numeric',
                    scale: [0, 1, 2],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            })
        );
        const current = buildBuilderSessionSnapshot(
            baseInput({
                scoringMode: 'custom',
                domains: customDomains,
                defaultScoring: {
                    type: 'numeric',
                    scale: [0, 1, 2],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
                targetScaleDrafts: { '0:0': '0,1,2,3' },
            })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects secondaryGroupingEnabled toggle as dirty', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(
            baseInput({
                secondaryGroupingEnabled: true,
                secondaryGroupLabel: 'Category',
            })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('returns to not-dirty when edits are reverted', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const edited = buildBuilderSessionSnapshot(baseInput({ title: 'Changed' }));
        expect(builderSessionSnapshotsEqual(baseline, edited)).toBe(false);
        const reverted = buildBuilderSessionSnapshot(baseInput({ title: 'Pack Title' }));
        expect(builderSessionSnapshotsEqual(baseline, reverted)).toBe(true);
    });

    it('strips secondary grouping in snapshot when disabled (matches save shape)', () => {
        const snapshot = buildBuilderSessionSnapshot(
            baseInput({
                secondaryGroupingEnabled: false,
                secondaryGroupLabel: 'Should Not Persist',
                domains: [
                    {
                        domain_id: 'A',
                        title: 'Domain A',
                        secondary_groups: [{ secondary_group_id: 'sg1', title: 'Group' }],
                        targets: [
                            {
                                target_id: 'A1',
                                title: 'Target',
                                success_criteria: '',
                                materials: '',
                                secondary_group_id: 'sg1',
                            },
                        ],
                    },
                ],
            })
        );

        expect(snapshot.pack.structure_labels?.secondary_group).toBeUndefined();
        expect(snapshot.pack.domains[0]?.secondary_groups).toBeUndefined();
        expect(snapshot.pack.domains[0]?.targets[0]).not.toHaveProperty('secondary_group_id');
    });
});

describe('builderIssueAnchorId', () => {
    it('builds stable anchor ids', () => {
        expect(builderIssueAnchorId({ field: 'title', message: 'Required' })).toBe(
            'builder-issue-title'
        );
        expect(
            builderIssueAnchorId({
                field: 'domain_id',
                domainIndex: 2,
                message: 'Invalid',
            })
        ).toBe('builder-issue-domain_id-2');
        expect(
            builderIssueAnchorId({
                field: 'scale',
                domainIndex: 0,
                targetIndex: 1,
                message: 'Invalid scale',
            })
        ).toBe('builder-issue-scale-0-1');
    });
});

describe('focusBuilderIssueAnchor Advanced pack settings', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function stubSticky(height: number) {
        return {
            getBoundingClientRect: () => ({
                top: 0,
                bottom: height,
                left: 0,
                right: 100,
                height,
                width: 100,
            }),
        };
    }

    function stubAnchor(options: {
        field: 'title' | 'default_scale' | 'domain_id';
        insideDetails: boolean;
        detailsOpen: boolean;
        stickyHeight?: number;
        domainIndex?: number;
        elementHeight?: number;
    }) {
        const focus = vi.fn();
        const scrollIntoView = vi.fn();
        const details = { open: options.detailsOpen };
        const elementHeight = options.elementHeight ?? 0;
        const element = {
            style: { scrollMarginTop: '' },
            scrollIntoView,
            closest: (selector: string) =>
                options.insideDetails && selector === 'details' ? details : null,
            querySelector: () => ({ focus }),
            getBoundingClientRect: () => ({
                top: 0,
                bottom: elementHeight,
                left: 0,
                right: 0,
                height: elementHeight,
                width: 0,
            }),
        };
        const issue =
            options.field === 'domain_id'
                ? {
                      field: 'domain_id' as const,
                      domainIndex: options.domainIndex ?? 0,
                      message: 'Invalid',
                  }
                : { field: options.field, message: 'Invalid' };
        const sticky =
            options.stickyHeight === undefined ? null : stubSticky(options.stickyHeight);
        vi.stubGlobal('document', {
            getElementById: (id: string) =>
                id === builderIssueAnchorId(issue) ? element : null,
            querySelector: (selector: string) =>
                selector === PACK_BUILDER_STICKY_CHROME_SELECTOR ? sticky : null,
        });
        return { details, focus, scrollIntoView, issue, element, sticky };
    }

    /**
     * CSSOM View `block: 'center'` centres the scroll-margin box in the viewport.
     * The element's resulting viewport top is derived from that, not a tuned offset.
     */
    function elementViewportTopAfterBlockCenter(input: {
        elementHeight: number;
        scrollMarginTop: number;
        viewportHeight: number;
    }): number {
        return (
            input.scrollMarginTop / 2 - input.elementHeight / 2 + input.viewportHeight / 2
        );
    }

    it('opens Advanced and lands on default_scale when that field fails validation', () => {
        const { details, focus, scrollIntoView, issue } = stubAnchor({
            field: 'default_scale',
            insideDetails: true,
            detailsOpen: false,
        });
        focusBuilderIssueAnchor(issue);
        expect(details.open).toBe(true);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('opens Advanced on submit reveal for default_scale without scrolling', () => {
        const { details, focus, scrollIntoView, issue } = stubAnchor({
            field: 'default_scale',
            insideDetails: true,
            detailsOpen: false,
        });
        revealBuilderIssueAnchor(issue);
        expect(details.open).toBe(true);
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(focus).not.toHaveBeenCalled();
    });

    it('does not reopen Advanced when it is already open', () => {
        const { details, issue } = stubAnchor({
            field: 'default_scale',
            insideDetails: true,
            detailsOpen: true,
        });
        revealBuilderIssueAnchor(issue);
        expect(details.open).toBe(true);
    });

    it('does not open a disclosure for title, which is outside Advanced', () => {
        const { details, issue } = stubAnchor({
            field: 'title',
            insideDetails: false,
            detailsOpen: false,
        });
        focusBuilderIssueAnchor(issue);
        expect(details.open).toBe(false);
    });

    it('clears a short sticky header when jumping to a single-issue field', () => {
        const QA_VIEWPORT_HEIGHT = 900;
        const QA_SHORT_STICKY_HEIGHT = 199;
        const QA_FIELD_HEIGHT = 42;
        const { scrollIntoView, issue, element, sticky } = stubAnchor({
            field: 'default_scale',
            insideDetails: true,
            detailsOpen: true,
            stickyHeight: QA_SHORT_STICKY_HEIGHT,
            elementHeight: QA_FIELD_HEIGHT,
        });

        focusBuilderIssueAnchor(issue);

        const stickyBottom = sticky!.getBoundingClientRect().bottom;
        const scrollMarginTop = Number.parseFloat(element.style.scrollMarginTop);
        expect(scrollMarginTop).toBe(measuredPackBuilderStickyHeightPx());
        expect(scrollMarginTop).toBe(QA_SHORT_STICKY_HEIGHT);
        const targetTop = elementViewportTopAfterBlockCenter({
            elementHeight: QA_FIELD_HEIGHT,
            scrollMarginTop,
            viewportHeight: QA_VIEWPORT_HEIGHT,
        });
        expect(targetTop).toBeGreaterThanOrEqual(stickyBottom);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });

    it('clears a tall sticky header when jumping through a long issue list', () => {
        const QA_VIEWPORT_HEIGHT = 900;
        const QA_TALL_STICKY_HEIGHT = 415;
        const QA_FIELD_HEIGHT = 42;
        const { scrollIntoView, issue, element, sticky } = stubAnchor({
            field: 'domain_id',
            domainIndex: 3,
            insideDetails: false,
            detailsOpen: false,
            stickyHeight: QA_TALL_STICKY_HEIGHT,
            elementHeight: QA_FIELD_HEIGHT,
        });

        focusBuilderIssueAnchor(issue);

        const stickyBottom = sticky!.getBoundingClientRect().bottom;
        const scrollMarginTop = Number.parseFloat(element.style.scrollMarginTop);
        expect(scrollMarginTop).toBe(measuredPackBuilderStickyHeightPx());
        expect(scrollMarginTop).toBe(QA_TALL_STICKY_HEIGHT);
        const targetTop = elementViewportTopAfterBlockCenter({
            elementHeight: QA_FIELD_HEIGHT,
            scrollMarginTop,
            viewportHeight: QA_VIEWPORT_HEIGHT,
        });
        expect(targetTop).toBeGreaterThanOrEqual(stickyBottom);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });

    it('scrolls default_scale after Advanced reflows, not to the collapsed geometry', () => {
        const QA_STALE_TOP = -328;
        const QA_VIEWPORT_HEIGHT = 900;
        const QA_TALL_STICKY_HEIGHT = 415;
        const EXPANDED_TOP = 180;
        const ELEMENT_HEIGHT = 40;
        let open = false;
        let layoutFlushed = false;
        const focus = vi.fn();
        const issue = { field: 'default_scale' as const, message: 'Invalid' };
        const sticky = stubSticky(QA_TALL_STICKY_HEIGHT);

        const layoutTop = () => (open && layoutFlushed ? EXPANDED_TOP : QA_STALE_TOP);

        const details = {
            get open() {
                return open;
            },
            set open(value: boolean) {
                open = value;
            },
        };

        let scrolledTop: number | null = null;
        const element = {
            style: { scrollMarginTop: '' },
            closest: (selector: string) => (selector === 'details' ? details : null),
            getBoundingClientRect: () => {
                if (open) {
                    layoutFlushed = true;
                }
                return {
                    top: layoutTop(),
                    bottom: layoutTop() + ELEMENT_HEIGHT,
                    left: 0,
                    right: 100,
                    height: ELEMENT_HEIGHT,
                    width: 100,
                };
            },
            scrollIntoView: vi.fn(() => {
                scrolledTop = layoutTop();
            }),
            querySelector: () => ({ focus }),
        };

        vi.stubGlobal('document', {
            getElementById: (id: string) =>
                id === builderIssueAnchorId(issue) ? element : null,
            querySelector: (selector: string) =>
                selector === PACK_BUILDER_STICKY_CHROME_SELECTOR ? sticky : null,
        });

        focusBuilderIssueAnchor(issue);

        expect(open).toBe(true);
        expect(layoutFlushed).toBe(true);
        expect(scrolledTop).not.toBe(QA_STALE_TOP);
        expect(scrolledTop).toBeGreaterThanOrEqual(0);
        expect(scrolledTop).toBeLessThan(QA_VIEWPORT_HEIGHT);
        expect(element.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
        });
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });

        const stickyBottom = sticky.getBoundingClientRect().bottom;
        const scrollMarginTop = Number.parseFloat(element.style.scrollMarginTop);
        expect(scrollMarginTop).toBe(QA_TALL_STICKY_HEIGHT);
        const targetTop = elementViewportTopAfterBlockCenter({
            elementHeight: ELEMENT_HEIGHT,
            scrollMarginTop,
            viewportHeight: QA_VIEWPORT_HEIGHT,
        });
        expect(targetTop).toBeGreaterThanOrEqual(stickyBottom);
    });
});

describe('builderSessionSnapshotsEqual on pack metadata', () => {
    it('compares pack_id independently from authoring fields', () => {
        const left = buildBuilderSessionSnapshot(baseInput({ packId: 'a' }));
        const right = buildBuilderSessionSnapshot(baseInput({ packId: 'b' }));
        expect(builderSessionSnapshotsEqual(left, right)).toBe(false);
    });
});

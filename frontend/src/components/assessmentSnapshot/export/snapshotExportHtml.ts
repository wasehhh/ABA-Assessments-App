import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import {
    buildSnapshotRenderPlan,
    SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
} from '../../../utils/snapshotLayoutEngine';
import { buildSnapshotScreenPlanConfig } from '../../../hooks/snapshotViewport';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { AssessmentSnapshotScreenDocument } from '../v1/AssessmentSnapshotScreenDocument';
import { SNAPSHOT_EXPORT_ENHANCEMENTS_SCRIPT } from './snapshotExportEnhancementsScript';
import { SNAPSHOT_EXPORT_DOCUMENT_CSS } from './snapshotExportInlineCss';

export const SNAPSHOT_EXPORT_DISCLAIMER =
    'This Assessment Snapshot is a raw clinical evidence record of assessment scores. It is not a diagnosis, treatment plan, or interpretive clinical report. Distribution and retention are governed by organization PHI policy.';

/** Frozen HTML-channel packing width — same constant as live screen fallback (PR14B §4.6). */
export const SNAPSHOT_HTML_EXPORT_VIEWPORT_REM = SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM;

export interface BuildSnapshotExportHtmlInput {
    profile: AssessmentSnapshotProfile;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
    generatedAt: Date;
}

function formatGeneratedAt(date: Date): string {
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/**
 * Render the screen-layout document used by the HTML export channel.
 * Viewport is frozen at {@link SNAPSHOT_HTML_EXPORT_VIEWPORT_REM}.
 */
export function renderSnapshotScreenDocumentMarkup(
    input: BuildSnapshotExportHtmlInput
): string {
    const generatedAtLabel = formatGeneratedAt(input.generatedAt);

    return renderToStaticMarkup(
        createElement(AssessmentSnapshotScreenDocument, {
            profile: input.profile,
            displayContext: input.displayContext,
            cycleDateLabels: input.cycleDateLabels,
            generatedAtLabel,
            viewportWidthRem: SNAPSHOT_HTML_EXPORT_VIEWPORT_REM,
        })
    );
}

export function wrapSnapshotExportDocumentHtml(screenDocumentMarkup: string): string {
    const safeCss = SNAPSHOT_EXPORT_DOCUMENT_CSS.replace(/<\/style/gi, '<\\/style');
    const safeScript = SNAPSHOT_EXPORT_ENHANCEMENTS_SCRIPT.replace(
        /<\/script/gi,
        '<\\/script'
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Assessment Snapshot Export</title>
<style>
${safeCss}
</style>
</head>
<body class="assessment-snapshot-export-html" data-assessment-snapshot-export-document data-export-mode="full" data-export-channel="html" data-assessment-snapshot-screen-viewport-rem="${SNAPSHOT_HTML_EXPORT_VIEWPORT_REM}">
<p class="snapshot-export-disclaimer">${SNAPSHOT_EXPORT_DISCLAIMER}</p>
${screenDocumentMarkup}
<script>
${safeScript}
</script>
</body>
</html>`;
}

/**
 * Standalone HTML for Snapshot export (PR14B HTML channel).
 *
 * Deterministic static serialization only — never reads the live preview DOM.
 * Screen RenderPlan at frozen viewport; CSS from {@link SNAPSHOT_EXPORT_DOCUMENT_CSS}.
 */
export function buildSnapshotExportHtml(input: BuildSnapshotExportHtmlInput): string {
    // Ensure the frozen plan is the authority used for serialization (INV-H1).
    buildSnapshotRenderPlan(
        input.profile,
        buildSnapshotScreenPlanConfig(SNAPSHOT_HTML_EXPORT_VIEWPORT_REM)
    );
    const markup = renderSnapshotScreenDocumentMarkup(input);
    return wrapSnapshotExportDocumentHtml(markup);
}

/**
 * HTML-channel download entry used by the export page.
 * Always static — output cannot depend on live DOM / collapse / stylesheet reachability.
 */
export function downloadSnapshotHtmlChannel(
    input: BuildSnapshotExportHtmlInput,
    assessmentId: string
): string {
    const html = buildSnapshotExportHtml(input);
    downloadSnapshotExportHtml(
        html,
        buildSnapshotExportFilename(assessmentId, input.generatedAt)
    );
    return html;
}

export function buildSnapshotExportFilename(
    assessmentId: string,
    generatedAt: Date = new Date()
): string {
    const date = generatedAt.toISOString().slice(0, 10);
    const safeId = assessmentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'assessment';
    return `assessment-snapshot-${safeId}-${date}.html`;
}

export function downloadSnapshotExportHtml(html: string, filename: string): void {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

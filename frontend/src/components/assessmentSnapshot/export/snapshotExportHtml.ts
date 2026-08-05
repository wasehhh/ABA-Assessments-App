import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildPrintRenderPlan } from '../../../utils/snapshotPrintRenderPlan';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { AssessmentSnapshotPrintDocument } from '../print/AssessmentSnapshotPrintDocument';
import { SNAPSHOT_EXPORT_FALLBACK_CSS } from './snapshotExportInlineCss';

export const SNAPSHOT_EXPORT_DISCLAIMER =
    'This Assessment Snapshot is a raw clinical evidence record of assessment scores. It is not a diagnosis, treatment plan, or interpretive clinical report. Distribution and retention are governed by organization PHI policy.';

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
 * Render the same print document used by the export preview / Print path.
 * Canonical mode `full` evidence geometry = AssessmentSnapshotPrintDocument.
 */
export function renderSnapshotPrintDocumentMarkup(
    input: BuildSnapshotExportHtmlInput
): string {
    const plan = buildPrintRenderPlan(input.profile, { paper: 'letter' });
    const generatedAtLabel = formatGeneratedAt(input.generatedAt);

    return renderToStaticMarkup(
        createElement(AssessmentSnapshotPrintDocument, {
            profile: input.profile,
            plan,
            generatedAtLabel,
            displayContext: input.displayContext,
            cycleDateLabels: input.cycleDateLabels,
        })
    );
}

/**
 * Collect same-origin stylesheet text from the live document for offline HTML.
 * Skips cross-origin sheets that throw on cssRules access.
 */
export function collectAccessibleStylesheetText(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const chunks: string[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const rules = sheet.cssRules;
            if (!rules) {
                continue;
            }
            for (const rule of Array.from(rules)) {
                chunks.push(rule.cssText);
            }
        } catch {
            // Cross-origin or otherwise unreadable — skip (do not embed remote URLs).
        }
    }

    return chunks.join('\n');
}

export function wrapSnapshotExportDocumentHtml(
    printDocumentMarkup: string,
    cssText: string
): string {
    const safeCss = cssText.replace(/<\/style/gi, '<\\/style');

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
<body class="assessment-snapshot-print" data-assessment-snapshot-export-document data-export-mode="full">
<p class="snapshot-export-disclaimer">${SNAPSHOT_EXPORT_DISCLAIMER}</p>
${printDocumentMarkup}
</body>
</html>`;
}

/**
 * Standalone HTML for Snapshot export (PR14A full mode).
 * Uses PrintRenderPlan + AssessmentSnapshotPrintDocument — not a tabular fork.
 * Scores/structure come from the frozen snapshot profile (G8).
 */
export function buildSnapshotExportHtml(input: BuildSnapshotExportHtmlInput): string {
    const markup = renderSnapshotPrintDocumentMarkup(input);
    return wrapSnapshotExportDocumentHtml(markup, SNAPSHOT_EXPORT_FALLBACK_CSS);
}

/**
 * Prefer mounted print DOM + live stylesheets so offline HTML matches the preview.
 * Falls back to renderToStaticMarkup + fallback CSS when the print root is missing.
 */
export function buildSnapshotExportHtmlFromMountedRoot(
    mountedRoot: ParentNode,
    input: BuildSnapshotExportHtmlInput
): string {
    const printRoot = mountedRoot.querySelector(
        '[data-assessment-snapshot-print-document]'
    );
    const markup = printRoot
        ? printRoot.outerHTML
        : renderSnapshotPrintDocumentMarkup(input);
    const liveCss = collectAccessibleStylesheetText();
    const css = liveCss.trim().length > 0 ? liveCss : SNAPSHOT_EXPORT_FALLBACK_CSS;
    return wrapSnapshotExportDocumentHtml(markup, css);
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

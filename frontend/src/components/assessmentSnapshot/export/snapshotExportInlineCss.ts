/**
 * Stylesheets for standalone Snapshot HTML export (PR14B HTML channel).
 *
 * Document CSS = compiled app stylesheet (build-time `index.css?inline`) followed
 * by export chrome / index geometry below. Chrome comes second so index geometry
 * and `!important` print/export rules win over utilities where they must.
 *
 * No live stylesheet collection. No external `<link>`.
 */
import appStylesheetText from '../../../index.css?inline';
import {
    buildTargetIndexScreenTableColumnCss,
    buildTargetIndexTableColumnCss,
} from '../../../utils/snapshotTargetIndexColumns';

/**
 * Tailwind / PostCSS keep documentation URLs inside block comments. Strip
 * comments so the offline file satisfies the existing no-`http(s):` self-
 * containment guard. There are no `@font-face` or `url(http…)` assets in the
 * compiled bundle (verified at implementation time).
 */
function stripCssComments(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Export chrome + Target Index geometry (cascade layer after the app bundle). */
export const SNAPSHOT_EXPORT_INLINE_CSS = `
:root { color-scheme: light; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}
.assessment-snapshot-export-html {
  color: #111;
  background: #fff;
  margin: 0;
  padding: 1rem;
}
.assessment-snapshot-export-html [data-assessment-snapshot-domain-segment],
.assessment-snapshot-export-html [data-assessment-snapshot-domain-zone] {
  display: grid !important;
}
.assessment-snapshot-export-html [data-assessment-snapshot-target-thread],
.assessment-snapshot-export-html [data-assessment-snapshot-thread] {
  break-inside: avoid;
}
.assessment-snapshot-export-html [data-assessment-snapshot-evidence-bead] {
  border-width: 1.5px !important;
  border-color: #374151 !important;
}
.assessment-snapshot-export-html [data-assessment-snapshot-evidence-bead][data-is-unscored='true'] {
  border-style: dashed !important;
  border-color: #4b5563 !important;
  background-color: #e5e7eb !important;
}
.assessment-snapshot-export-html [data-assessment-snapshot-target-max-ring],
.assessment-snapshot-export-html [data-assessment-snapshot-legend-max],
.assessment-snapshot-export-html .assessment-snapshot-max-ring {
  border: 2px solid #15803d !important;
  background-color: #ffffff !important;
  color: #14532d !important;
}
.assessment-snapshot-export-html [data-assessment-snapshot-thread-code] {
  text-align: right !important;
}
.assessment-snapshot-export-html [data-assessment-snapshot-target-index-screen] {
  margin-top: 1rem;
}
.assessment-snapshot-export-html [data-assessment-snapshot-target-index-panel][hidden] {
  display: none;
}
.assessment-snapshot-print {
  color: #000 !important;
  background: #fff !important;
  border: none !important;
  margin: 0 !important;
  box-shadow: none !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.assessment-snapshot-print .assessment-snapshot-print-page + .assessment-snapshot-print-page {
  break-before: page;
  page-break-before: always;
}
${buildTargetIndexTableColumnCss()}
${buildTargetIndexScreenTableColumnCss()}
.assessment-snapshot-print [data-assessment-snapshot-domain-segment],
.assessment-snapshot-print [data-assessment-snapshot-domain-zone] {
  display: grid !important;
}
.assessment-snapshot-print [data-assessment-snapshot-target-thread],
.assessment-snapshot-print [data-assessment-snapshot-thread] {
  break-inside: avoid;
  page-break-inside: avoid;
}
.assessment-snapshot-print [data-assessment-snapshot-evidence-bead] {
  border-width: 1.5px !important;
  border-color: #374151 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.assessment-snapshot-print [data-assessment-snapshot-evidence-bead][data-is-unscored='true'] {
  border-style: dashed !important;
  border-color: #4b5563 !important;
  background-color: #e5e7eb !important;
}
.assessment-snapshot-print [data-assessment-snapshot-target-max-ring],
.assessment-snapshot-print [data-assessment-snapshot-legend-max],
.assessment-snapshot-print .assessment-snapshot-max-ring {
  border: 2px solid #15803d !important;
  background-color: #ffffff !important;
  color: #14532d !important;
}
.assessment-snapshot-print [data-assessment-snapshot-thread-code] {
  text-align: right !important;
}
.assessment-snapshot-print .assessment-snapshot-print-connector {
  position: absolute;
  top: 0;
  left: calc(-0.625rem - 0.0625rem);
  width: 1px;
  height: 3.25rem;
  background-color: #64748b;
}
.snapshot-export-disclaimer {
  font-size: 0.8rem;
  border: 1px solid #ccc;
  background: #fafafa;
  padding: 0.65rem 0.75rem;
  margin: 0 0 1rem;
}
`;

/**
 * Full inlined document stylesheet for the HTML export channel.
 * Order: compiled `index.css` bundle, then {@link SNAPSHOT_EXPORT_INLINE_CSS}.
 */
export const SNAPSHOT_EXPORT_DOCUMENT_CSS = `${stripCssComments(appStylesheetText)}\n${SNAPSHOT_EXPORT_INLINE_CSS}`;

/** @deprecated Alias — prefer {@link SNAPSHOT_EXPORT_INLINE_CSS}. */
export const SNAPSHOT_EXPORT_FALLBACK_CSS = SNAPSHOT_EXPORT_INLINE_CSS;

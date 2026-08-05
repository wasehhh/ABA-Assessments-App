/**
 * Fallback CSS for standalone Snapshot HTML when live stylesheets cannot be read
 * (unit tests / non-browser). Prefer collecting document.styleSheets on download.
 *
 * Includes Snapshot print composition rules (from index.css) plus minimal layout
 * so Target Threads structure remains readable offline.
 */
export const SNAPSHOT_EXPORT_FALLBACK_CSS = `
:root { color-scheme: light; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
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
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] {
  width: 100%;
  border-collapse: collapse;
}
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] th,
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] td {
  border-bottom: 1px solid #9ca3af;
  padding: 0.2rem 0.35rem;
  text-align: left;
  vertical-align: top;
}
.assessment-snapshot-print [data-assessment-snapshot-target-index-row] {
  break-inside: avoid;
  page-break-inside: avoid;
}
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
  left: calc(-0.625rem - 1px);
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
.no-print { display: none !important; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.shrink-0 { flex-shrink: 0; }
.min-w-0 { min-width: 0; }
.relative { position: relative; }
.w-full { width: 100%; }
.rounded-full { border-radius: 9999px; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.font-semibold { font-weight: 600; }
.tabular-nums { font-variant-numeric: tabular-nums; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.border-b { border-bottom-width: 1px; border-bottom-style: solid; }
.border-t { border-top-width: 1px; border-top-style: solid; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-400 { border-color: #9ca3af; }
.border-gray-500 { border-color: #6b7280; }
.text-black { color: #000; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
.text-gray-900 { color: #111827; }
.bg-gray-300 { background-color: #d1d5db; }
.border-dashed { border-style: dashed; }
`;

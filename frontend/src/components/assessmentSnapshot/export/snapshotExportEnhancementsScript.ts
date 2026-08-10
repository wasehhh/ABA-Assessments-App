/**
 * Minimal dependency-free enhancements for standalone Snapshot HTML (PR14B §4.7).
 *
 * Graceful degradation: index markup ships expanded; this script only adds
 * collapse. Bead scores remain in the DOM; hover tip is enhancement only.
 * Must NEVER recompute RenderPlan or hide evidence when absent.
 */
export const SNAPSHOT_EXPORT_ENHANCEMENTS_SCRIPT = `(function () {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('[data-assessment-snapshot-target-index-screen]').forEach(function (root) {
    var btn = root.querySelector('[data-assessment-snapshot-target-index-heading]');
    var panel = root.querySelector('[data-assessment-snapshot-target-index-panel]');
    var label = root.querySelector('[data-assessment-snapshot-target-index-toggle-label]');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = root.getAttribute('data-expanded') !== 'false';
      var next = !open;
      root.setAttribute('data-expanded', next ? 'true' : 'false');
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      if (next) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
      if (label) {
        label.textContent = next ? 'Hide' : 'Show';
      }
    });
  });

  var tip = document.createElement('div');
  tip.setAttribute('data-assessment-snapshot-bead-tooltip', 'true');
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('hidden', '');
  tip.style.cssText =
    'position:fixed;z-index:9999;max-width:20rem;padding:0.35rem 0.5rem;' +
    'border:1px solid #9ca3af;border-radius:0.25rem;background:#111827;color:#f9fafb;' +
    'font:12px/1.35 ui-sans-serif,system-ui,sans-serif;pointer-events:none;';
  document.body.appendChild(tip);

  function hideTip() {
    tip.setAttribute('hidden', '');
    tip.textContent = '';
  }

  document.addEventListener('mouseover', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var bead = target.closest('[data-assessment-snapshot-evidence-bead]');
    if (!bead) return;
    var text = bead.getAttribute('title') || bead.getAttribute('aria-label');
    if (!text) return;
    tip.textContent = text;
    tip.removeAttribute('hidden');
  });

  document.addEventListener('mousemove', function (event) {
    if (tip.hasAttribute('hidden')) return;
    tip.style.left = Math.min(event.clientX + 12, window.innerWidth - tip.offsetWidth - 8) + 'px';
    tip.style.top = Math.min(event.clientY + 12, window.innerHeight - tip.offsetHeight - 8) + 'px';
  });

  document.addEventListener('mouseout', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-assessment-snapshot-evidence-bead]')) {
      hideTip();
    }
  });
})();`;

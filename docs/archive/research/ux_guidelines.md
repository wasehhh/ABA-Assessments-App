# Research: UX Guidelines & Clinical Workflow

## Executive Summary
Clinicians operate in dynamic, high-attention environments (floor, play area) requiring mobile-first, distraction-free interfaces. The "Assessment Grid" is the primary mental model for progress tracking.

## Detailed Findings

### The Clinical Environment
*   **Device:** Primarily Tables (iPad) or Laptops on mobile carts.
*   **Attention:** Split focus between the child and the screen.
*   **Latency:** Low tolerance for loading spinners.

### Core Workflows
1.  **Preparation:** "What am I testing today?" (Filtering domains/items).
2.  **Scoring:** Rapid data entry (0-4 scale). Needs "Next" button auto-advance.
3.  **Review:** "Show me the gaps." (The Grid View).

### Visualization Standards
*   **The Grid:** A dense heatmap style visualization. 25 Rows (Domains) x N Columns (Skills).
*   **Colors:** Standardized mappings (e.g., Blue=Initial, Green=Progress).
*   **History:** Users expect to toggle between assessment dates to see changes.

## Legal & Privacy Implications
*   **Screen Privacy:** UI density should allow "hiding" sensitive names if a parent walks by (Privacy Mode).

## Engineering Implications
*   **Offline Mode:** High value feature. Optimistic UI updates.
*   **Canvas vs DOM:** For the Grid (500+ items), DOM nodes can get heavy. Consider Canvas or optimized Flexbox.

## Risks & Recommendations
*   **Risk:** Over-complicating the scroing screen.
*   **Recommendation:** Use a "Focus Mode" for scoring (one item at a time). Use "Dashboard Mode" for valid review.

# Research: ABA Assessment Systems

## Executive Summary
ABA assessments like ABLLS-R and VB-MAPP are the standard of care for autism treatment. They are complex, grid-based curricula that track hundreds of skills over years. Digitization must prioritize the "Grid View" and historical tracking while respecting that the *content* is often IP-protected.

## Detailed Findings

### ABLLS-R (Assessment of Basic Language and Learning Skills – Revised)
*   **Purpose:** Comprehensive assessment and curriculum guide for children with language delays. Acts as a roadmap for *what* to teach.
*   **Structure:** 25 Domains (A–Z), 544 Skills.
    *   *Basic Learner Skills (A-P):* Cooperation, Reinforcer Effectiveness, Visual Performance, etc.
    *   *Academic (Q-T):* Reading, Math, Writing.
    *   *Self-Help (U-X):* Dressing, Eating, Grooming.
    *   *Motor (Y-Z):* Gross and Fine Motor.
*   **Scoring:** Variable scale (0-2 or 0-4).
*   **Visuals:** Uses a grid system where cells are filled in with colors to visualize progress (e.g., Initial = Blue, 6-month = Green).

### VB-MAPP (Verbal Behavior Milestones Assessment and Placement Program)
*   **Purpose:** Based on Skinner’s analysis of verbal behavior. Focused on language milestones and barriers.
*   **Structure:** 3 Levels (0-18m, 18-30m, 30-48m). Includes Barriers Assessment and Transitions.
*   **Scoring:** 0, 0.5, 1 (Milestones).
*   **Visuals:** Bar charts and filled skyscrapers for milestones.

### Other Systems
*   **AFLS:** Functional living skills (home, community). Similar grid structure to ABLLS.
*   **PEAK:** Relational Frame Theory (RFT). Complex scoring and transformation rules.

## Legal & Privacy Implications
*   **IP Risk:** Storing the actual text of questions/criteria is a copyright violation without a license.
*   **Privacy:** Assessment results are PHI (Personal Health Information) and must be protected under PHIPA/HIPAA.

## Engineering Implications
*   **Data Structure:** Needs a flexible schema (Framework -> Domain -> Item). Hardcoding "ABLLS" columns is an anti-pattern.
*   **Visualization:** The Frontend must support complex SVG/Canvas rendering for the "Grid View".
*   **State:** Assessment scoring is a transactional workflow (draft -> finalized).

## Risks & Recommendations
*   **Risk:** Users expecting a "clone" of official tools.
*   **Recommendation:** Provide a "Basement Builder" where users import their own templates to populate the grid structure.

# Research: Copyright & Intellectual Property

## Executive Summary
The primary ABA assessments (ABLLS-R, VB-MAPP) are strictly protected intellectual property. Unauthorized digital reproduction of their item text, scoring criteria, and specific grid layouts is a legal risk. The platform must operate as a "Container" or "Player" for user-licensed content, not a distributor of pirated content.

## Detailed Findings

### Ownership
*   **ABLLS-R:** Owned by Partington Behavior Analysts.
*   **VB-MAPP:** Owned by Mark Sundberg (AVB Press).
*   **Status:** Aggressively protected. "Fair use" generally does not cover reproducing the entire assessment digitally.

### Dangerous Patterns (Do NOT Implement)
*   **Hardcoded Content:** Embedding the text of "Task C1" directly in the code or database seed files.
*   **Public Sharing:** Allowing User A to share their "ABLLS Template" with User B (creating a piracy network).
*   **Official Branding:** Using logos or implying official partnership without a contract.

## Legal & Privacy Implications
*   **Licensing:** To officially reproduce the text, a royalty agreement is required (like CentralReach has).
*   **Liability:** Platforms can be liable for contributory infringement if they facilitate piracy.

## Engineering Implications
*   **Template Architecture:** The system must accept generic structures (Domain Name, Item ID, Max Score) without knowing the *content*.
*   **User Uploads:** Shifts liability to the user. "I certify I own a copy of this assessment."
*   **Disclaimer:** UI must prominently state that the platform provides the *tools* for assessment, not the assessment *content* itself.

## Risks & Recommendations
*   **Risk:** Users uploading copyrighted text and us hosting it.
*   **Recommendation:** Implement specific Terms of Service clauses. Store templates per-organization (no global sharing). Use "generic" identifiers in code (e.g., `item_code` vs `ablls_code`).

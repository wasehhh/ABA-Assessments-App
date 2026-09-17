# Evalis Platform

This layer owns organizations, learners, user identity, membership, platform-level audit, and entitlements.

**These entities live in the `public` schema and are not moving. What changed is authority, not location.**

The layer is owned by the **Evalis Platform SPM** — a peer of the two product SPMs, not a superior. It reads products and cannot change them; when a product must act, it sends a prompt.

**Until the post-Alpha restructure, the repository root is Evalis Assessment's.** `database/`, `docs/`, `scripts/` and `frontend/` at root are Assessment's despite this directory existing. Without that sentence, a reader sees two named app directories and infers the root is shared — the exact drift this directory exists to prevent.

This directory currently holds documents, not code or migrations.

## Division

Applied in order:

1. **INDEPENDENCE** — would Evalis Programming still need this if Evalis Assessment had never been purchased? Yes → platform's.
2. **ENTITY** — governs `organizations`, `user_profiles`, `clients`, `user_invites`, `audit_logs` → platform's. Governs `assessments`, `assessment_cycles`, `assessment_scores`, `content_packs`, reports, Layer 5 → Assessment's.
3. **RESIDUE** — if neither test is clearly yes, it is Assessment's. Default down to a product, never up.
4. **CONTENT** — a document can pass the entity test on its subject and fail on its body, when it carries product semantics another product would read as binding. Such a file is rewritten and split, never relocated.

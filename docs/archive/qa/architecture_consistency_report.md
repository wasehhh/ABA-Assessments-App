# Architecture Consistency Report

## Executive Summary
**Status**: 🔴 CRITICAL DIVERGENCE FOUND
**Date**: 2025-12-10

## Major Discrepancies

### 1. Database Schema Divergence (Critical)
**Spec (`docs/architecture/database_schema.md`)**:
- Defines normalized tables for `frameworks`, `framework_domains`, and `framework_items`.
- Relationships: `frameworks` -> `framework_domains` -> `framework_items`.

**Implementation (`frontend/src/types/index.ts` & `services/packs.ts`)**:
- Uses a single table `content_packs`.
- Stores structure in a JSONB column `pack_data`.
- Uses `ContentPack` and `ContentPackData` types instead of normalized entities.

**Impact**:
- **Scalability**: JSON queries are slower for individual item analysis across thousands of assessments.
- **Data Integrity**: Harder to enforce strict constraints (e.g., max_score types) at the DB level.
- **Compliance**: Harder to audit specific item changes if buried in JSON.
- **Future Proofing**: "Phase 2 Analytics" will be significantly harder to implement without normalized data.

**Recommendation**:
- **Immediate**: Flag this to the Builder Agent. The schema must be normalized before production data is accumulated.
- **Migration Plan**: Create the specific tables and migrate the logic in `packs.ts` to insert into these tables transactionally.

### 2. Implementation Terminology
**Spec**:
- Terms: `Frameworks`, `Items`, `Domains`.

**Implementation**:
- Terms: `ContentPacks`, `Targets`, `Domains`.
- Note: `ContentPacks` maps to `Frameworks`. `Targets` maps to `Items`.

**Impact**:
- Confusion for developers and inconsistencies in documentation.

### 3. Backend Service Dependency
**Spec**:
- Mentions "Optional FastAPI service".

**Implementation**:
- `frontend/src/services/packs.ts` calls `http://localhost:8000/parse-template`.

**Risk**:
- Hardcoded `localhost` URL will fail in deployed environment.
- Lack of error handling if the Python service is down.

## Conclusion
The current implementation has diverged significantly from the architectural specification, strictly in the data modeling layer. While the functionality (uploading and storing) might work for MVP, it incurs technical debt that violates the "Scalability" and "Future Phases" requirements of the Master Spec.

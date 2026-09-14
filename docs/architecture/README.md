# Evalis Assessment — architecture contracts

**Scope: these contracts govern Evalis Assessment only.**

This repository contains two applications. The contracts in this directory describe the one rooted at `[repo] frontend/`, and they do **not** apply to any other application here.

**Specifically, none of the following apply outside Evalis Assessment:**

- **Layer 0 through Layer 5** — score interpretation, domain profiles, the Assessment Snapshot, the Learner Map, the Communication Report, and the canonical taxonomy
- **The G1–G8 runtime laws**
- **The Canonical Assessment Builder Architecture** and its Phase A–D contracts
- **The report contracts** — authoring, version history, presentation
- **Effective Scoring**, `pack_snapshot` freezing, Uniform/Custom resolution, and every scoring semantic in these files

**If you are an agent working in `[repo] programming/`, these are not your house rules.** Evalis Programming's architecture lives in `[repo] programming/docs/` and is owned by its own SPM. Applying an Assessment contract to Programming is a boundary violation, not a shortcut.

## The one document here that does cross the boundary

`cross_app_identity_contract.md` is written **for** a consuming application. It states what Evalis Assessment exposes and guarantees to another app in the same database. **It is the only file in this directory that another application should read as binding on itself.**

## Reading these contracts

Each file describes a product contract the code must satisfy. They are authoritative over implementation: where a contract and the code disagree, the code is wrong or the contract is stale, and neither is resolved by guessing.

**They are not a roadmap.** Forward planning for this application is maintained outside the repository.

# Release Notes — Phase A Runtime Truth

**Change:** `feat(scoring): establish effective scoring runtime truth`

## Summary

All clinician-facing runtime surfaces now resolve scoring definitions through a single **Effective Scoring** authority (`resolveEffectiveScoring`), using each assessment’s frozen `pack_snapshot` (never a later live pack edit).

## Intentional behavioural convergence

### Checkbox targets without task steps

When a checkbox / task-analysis target has **neither** an explicit scale **nor** task steps, Effective Scoring applies one product fallback:

- Allowed values: `[0, 1, 2, 3, 4]`
- Maximum score: `4`

Surfaces that previously derived checkbox maxima differently (for example export-local vs Matrix) now agree on this canonical fallback. This is an intentional consistency fix, not a Builder authoring change.

## Out of scope (unchanged)

- Assessment Builder UI and save behaviour
- Phase B inheritance / Uniform mode / sparse overrides
- Pack schema and import redesign

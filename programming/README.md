# Evalis Programming

**Status: pre-code.** This directory is a prepared, empty subtree. No application code has been written here yet.

## What this is

Evalis Programming is the second application in the Evalis product line: general ABA programming — programs, targets, teaching procedures, session data and mastery tracking. SBT is one protocol inside it, later.

It is a separate application, presented separately to customers, sharing a repository and a database with Evalis Assessment.

## What lands here

A Bolt.new prototype export (React + TypeScript + Vite + Tailwind) fills `frontend/`. Everything else is built from there.

```
programming/
  frontend/    the application
  database/    its migrations, in the `programming` Postgres schema
  docs/        its architecture contracts
  tests/       its tests
```

**This subtree is fully self-contained.** It borrows nothing from the repository root. Root-level `database/`, `docs/`, `scripts/` and `frontend/` belong to Evalis Assessment and are not shared infrastructure.

## Ownership

**This application is owned by the Evalis Programming SPM.** Its architecture, schema, roadmap and agent rules are written there, not by the Assessment SPM, who prepared this directory and stops at its edge.

## The two rules that cross the boundary

**1. The app boundary.** Layer 5 canonical mapping and taxonomy belong exclusively to Evalis Assessment. SBT and the protocol engine belong exclusively to Evalis Programming. **Neither app builds, claims or designs the other's half.**

**2. Identity is borrowed, never redefined.** Assessment owns learner, organisation and user identity. This application holds foreign keys into Assessment's identity tables and **never creates its own learner, organisation or user tables — not even a temporary placeholder with its own ids.**

Read `[repo] docs/architecture/cross_app_identity_contract.md` before writing any schema here. It states exactly what Assessment exposes, what may be referenced, what must never be written, and what Assessment commits not to change without notice.

## Database

Evalis Programming lives in the **`programming` Postgres schema** of the shared Evalis Supabase project, alongside Assessment's `public` schema. Foreign keys work natively across schemas within one database.

**During the AIM Alpha pilot, development happens against a local Supabase CLI instance and nothing is applied to the hosted project.** The eventual link is a deploy, not a migration.

**The prohibition on Supabase CLI use against the hosted project is absolute and applies to this app too.** A local instance is a different thing and is the intended development path here.

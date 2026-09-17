# Apply order

**One database, three migration sources.** Ordering is global across all three directories: filename date order, everywhere. Not directory-then-date.

**A migration touches one layer's tables.** One that would touch two is not a migration — it is a platform decision that has not been made, and it stops until it is.

**Manual-apply only:** by hand in the Supabase SQL editor, one file at a time, verified with a catalogue query after each. **A successful-looking run in the editor is not verification** — it is not a catalogue read.

**The historical ledger at `[repo] database/migrations/` is frozen and never re-divided.**

## Deliberately not specified yet

The cross-directory procedure is unwritten because today there is one ledger, one applier and zero cross-directory ordering. **It gets written the first time a migration is actually proposed in a second directory — against a real case rather than an imagined one.**

## Why these rules exist

Three failure modes from this project's own history:

- A migration file committed and never applied, found only by a live failure.
- A constraint added to a table nobody independently re-verified.
- An SQL editor reporting success mistaken for verification.

**Everything in this document was learned by getting it wrong.**

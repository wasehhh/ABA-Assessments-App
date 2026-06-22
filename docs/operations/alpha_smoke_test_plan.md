# Evalis — Manual Alpha Smoke Test Plan

**Version:** Alpha pre-launch (updated for **PR10** — production Learner Map export)  
**Audience:** QA leads, clinical supervisors, designated Alpha testers at AIM, and Cursor-assisted QA agents  
**Companion doc:** [`alpha_runbook.md`](./alpha_runbook.md) (therapist-facing walkthrough)

---

## 1. Purpose

This smoke test validates that Evalis supports a **real clinical session** end-to-end: login → client → assessment → scoring → notes → submit → review → approve → **printable report / CSV export / Learner Map export**.

It is **not** automated QA, unit testing, or exhaustive edge-case fuzzing. It is **operational workflow validation**—whether therapists and supervisors can execute the Alpha path with **trust**, **clarity**, and **correct data**.

**Why it matters before Alpha**

- AIM Alpha is a **controlled** deployment with a **narrow pack scope** (numeric + yes/no). Failures here directly affect therapist confidence and supervisor sign-off.
- Known risks (role locks, modal navigation, note persistence, compare cycles, Chrome reports) must be **exercised once on the real environment** before inviting clinical staff.
- A short, repeatable pass gives a **Go / No-Go** signal without enterprise QA overhead.

**What a pass means**

- Core workflows complete without **blockers** (see §5).
- **Major** issues are documented with a mitigation plan; none remain unacknowledged for launch day.

---

## Recommended Execution Tiers

Use this tiered model to sequence smoke execution. **Test definitions, expected results, severity levels, and acceptance criteria in §3–§6 are unchanged** — tiers only define *when* to run which IDs.

> **PR10 development should pause if Phase 1 produces any Blocker-level findings.**

### Phase 1 — Go / No-Go Smoke (Required Before Alpha)

**Purpose:** Determine whether Evalis is safe for Alpha deployment.

**Include:**

- **AUTH** (§A)
- **CLIENT** (§B)
- **EXEC** (§C)
- **MODAL** (§D)
- **NOTES** (§E)
- **LIFE** (§F)
- **ROLE** (§G)
- **RPT** (§I)
- **LMAP-01** through **LMAP-08** (§I2)

**Expected duration:** 45–60 minutes.

**Output:** **GO** | **GO WITH KNOWN ISSUES** | **NO-GO**

---

### Phase 2 — Extended Workflow Validation (Recommended)

**Purpose:** Identify non-blocking workflow defects before broader rollout.

**Include:**

- **CYCLE** (§H)
- **LMAP-09**, **LMAP-10** (§I2)
- Remaining export edge cases (§I2 out-of-scope notes, bookmarked URL bypass, optional Full spot-checks beyond Phase 1 minimum)
- Additional exploratory testing (§J **RHYTHM-01**–**RHYTHM-03**, §4 **STRESS-01**–**STRESS-07**)

**Expected duration:** 30–45 minutes.

**Output:** Extended QA Report

---

### Phase 3 — Human Clinical Validation

**Purpose:** Validate clinical trust, workflow comfort, and supervision usability.

**Human-only items:**

- **RHYTHM-04** (§J)
- **STRESS-08** (§4)
- Final clinical sign-off (§6)

Cursor agents may document findings but **cannot** determine pass/fail for Phase 3.

---

## 2. Testing Environment Requirements

| Requirement | Detail |
|-------------|--------|
| **Browser (general use)** | Current Chrome recommended for all testing. |
| **Browser (reports & Learner Map export)** | **Google Chrome required** for printable Assessment Report, Learner Map **Print / Save PDF**, and primary export sign-off. Do not sign off report/export using Safari/Firefox during Alpha. |
| **Environment** | Alpha Supabase project + hosting URL provided by the Evalis/AIM contact. Confirm `frontend/.env` (or deployed env) points at the **intended** Alpha project before testing. |
| **Data policy** | Use **synthetic / de-identified** test clients unless AIM explicitly approves otherwise. |
| **Assessment pack** | **One approved Alpha pack** (numeric and/or yes/no targets only). **Do not** use checkbox or task-analysis packs. |
| **Accounts (minimum)** | 1× **Therapist**, 1× **Senior Therapist** (or Admin acting as reviewer), optional 1× **Viewer**, 1× **Admin** (pack/user setup if needed). |
| **Prerequisites** | Org exists; users can log in; Alpha pack uploaded or pre-seeded; at least one test client. |
| **Session** | Stable network; allow **75–105 minutes** for full pass (includes §I2 Learner Map export); 25–35 minutes for abbreviated blocker-only pass. |
| **Learner Map prerequisites** | For §I2 positive-path tests: at least one assessment with **≥2 cycles** and **≥1 scored target**. For gating tests (LMAP-02): one assessment with **only 1 cycle** and/or one with **no scored targets**. Optional: one domain with **no scored targets** for LMAP-09. |
| **Artifacts** | Screenshot or short screen recording for any **Blocker** or **Major** failure; note browser version and role used. |

**Assumptions**

- Invite/signup path works per org setup (see `docs/architecture/supabase_setup.md` if first-admin bootstrap is needed).
- No AI features; no mobile-specific optimization required for Alpha sign-off.

---

## 3. Core Smoke Test Areas

**Severity legend**

| Level | Meaning |
|-------|---------|
| **Blocker** | Wrong data, broken lifecycle, or cannot complete Alpha workflow — **stop launch**. |
| **Major** | Workflow completes with significant confusion, workaround, or trust loss — **fix or document before launch**. |
| **Minor** | Cosmetic, wording, or low-impact friction — **track, may ship with known issue**. |

**How to record results**

- **Pass / Fail / N/A** per test ID  
- **Notes:** what you saw, role, browser, assessment ID if useful  

---

### A. Authentication & Access

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **AUTH-01** | Valid login | Open app URL → sign in with therapist credentials. | Dashboard or default landing loads; no error loop. | Blocker | |
| **AUTH-02** | Wrong credentials | Sign in with incorrect password. | Clear error; no partial session or blank app. | Major | |
| **AUTH-03** | Session persistence | After login, refresh page once. | Still authenticated; profile/org context intact. | Major | |
| **AUTH-04** | Logout / re-login | Sign out (if available) or clear session per org policy → sign in again. | Clean session; correct org data. | Major | |
| **AUTH-05** | Invite path (if used) | Complete invite signup/link flow for a **new** test user (once per Alpha). | User lands in correct org with expected role. | Blocker | Skip if pre-provisioned only. |

---

### B. Client & Assessment Creation

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **CLIENT-01** | Create client | As therapist or admin: Clients → create client with required fields. | Client appears in list; no silent failure. | Blocker | |
| **CLIENT-02** | Client error visibility | Trigger a save error (e.g. invalid required field if easy). | Red/dismissible error message; form stays open. | Major | |
| **CLIENT-03** | Create assessment | Open client → create assessment → select **Alpha pack** (numeric/yes-no). | Assessment opens matrix/overview; status draft/in progress. | Blocker | |
| **CLIENT-04** | Duplicate guard | Try creating second assessment for same client + same pack. | Clear message; no duplicate row without intent. | Major | |
| **CLIENT-05** | Pack snapshot | Note pack title/version on assessment → (optional) archive pack in admin. | Assessment still loads from **snapshot**; scoring UI intact. | Major | |

---

### C. Assessment Execution Workflow

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **EXEC-01** | Overview dashboard | Open assessment → stay on domain overview. | Cards show objective labels (e.g. completeness, score gains wording); domain list readable. | Minor | |
| **EXEC-02** | Enter domain | Click a domain card. | Domain scoreboard loads with targets and score controls. | Blocker | |
| **EXEC-03** | Numeric scoring | On a numeric target: select a scale value. | Score highlights; overview/domain progress updates after save indicator. | Blocker | |
| **EXEC-04** | Yes/no scoring | On a yes/no target: select Yes or No. | Score updates; same persistence as numeric. | Blocker | |
| **EXEC-05** | Score persistence | Score 3 targets → hard refresh browser → reopen same assessment/cycle. | All three scores unchanged. | Blocker | |
| **EXEC-06** | Toggle/clear score | Click same score again (if supported). | Score clears or toggles per product behavior; no corrupt state. | Major | |
| **EXEC-07** | Domain navigation | Use Previous/Next domain footer controls across all domains. | Moves only within pack; no crash; scores retained. | Major | |
| **EXEC-08** | Save indicator | Change a score; watch header/footer save state. | Saving/saved feedback appears; no endless “saving”. | Major | |

---

### D. Target Details Modal Workflow

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **MODAL-01** | Open modal | From scoreboard: View on one target. | Modal opens with target ID, title, position label **Target X of Y**. | Blocker | |
| **MODAL-02** | Clinical context sections | Review modal body. | Description (if present), Success Criteria / Materials, Instructions, Examples, Target Notes (if present), Current Status, Clinical Notes—in sensible order. | Major | |
| **MODAL-03** | Score in modal | Change score using controls inside modal. | Score updates in modal and on scoreboard row. | Blocker | |
| **MODAL-04** | Next target | Click **Next Target** without closing modal. | Title, status, pack fields, and score controls update to next target in **same domain**. | Blocker | |
| **MODAL-05** | Previous target | Click **Previous Target**. | Content updates correctly; no stale target A data on target B. | Blocker | |
| **MODAL-06** | Nav boundaries | On first target: Previous disabled. On last: Next disabled. | Buttons disabled appropriately; no wrap to other domain. | Major | |
| **MODAL-07** | Close modal | Close via X. | Modal dismisses; scoreboard reflects last changes. | Major | |

---

### E. Clinical Notes & Save Behavior

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **NOTES-01** | Enter note | Open target A modal → enter distinct Clinical Note text → blur or close. | Note saved (reopen target A to confirm). | Blocker | |
| **NOTES-02** | Navigate saves note | On target A: type note → **Next Target** (do not manually blur). | Target A note persisted; target B Clinical Notes empty or B’s own note only. | Blocker | |
| **NOTES-03** | No cross-target leak | Alternate A/B notes via Next/Previous. | Each target shows only its own Clinical Note after reopen. | Blocker | |
| **NOTES-04** | Target Notes vs Clinical | Target with CSV `notes` field populated. | **Target Notes** (read-only pack text) separate from **Clinical Notes** (score note). | Major | |
| **NOTES-05** | Refresh persistence | Add note → refresh page → reopen target. | Clinical Note still correct. | Blocker | |

---

### F. Assessment Lifecycle (save / submit / review / approve)

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **LIFE-01** | Submit (complete) | Score all targets → Submit → confirm **Submit**. | Status **submitted**; therapist editing locked on matrix/modal. | Blocker | |
| **LIFE-02** | Submit (unscored) | Leave ≥1 target unscored → Submit. | Warning; button **Submit with Unscored Targets**; submit still possible if confirmed. | Major | |
| **LIFE-03** | Post-submit therapist | As therapist: open submitted assessment. | Scores/notes read-only; clear workflow label (e.g. awaiting review). | Blocker | |
| **LIFE-04** | Reviewer edit | As senior/admin: open submitted → change one score + note. | Saves succeed; data correct after refresh. | Blocker | |
| **LIFE-05** | Approve | As senior/admin: Approve assessment. | Status **approved**; all roles read-only for scoring/notes. | Blocker | |
| **LIFE-06** | Success messaging | After submit (therapist view). | Clear confirmation; assessment findable under Submitted filter/tab if applicable. | Major | |

---

### G. Role Restrictions

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **ROLE-01** | Therapist submitted lock | Therapist on submitted assessment: try score + note in modal and table. | No mutation; disabled/read-only. | Blocker | |
| **ROLE-02** | Reviewer submitted edit | Senior/admin on submitted (active cycle): edit score. | Allowed when cycle in progress per org rules. | Blocker | |
| **ROLE-03** | Approved lock (all) | Any role on approved: try edit. | No mutation. | Blocker | |
| **ROLE-04** | Viewer | Viewer login: open assessment. | View-only; no submit/approve/score edits. | Major | |
| **ROLE-05** | Admin pack tools | Admin: Content Packs visible; therapist: per org policy. | Matches expected Alpha permissions. | Major | |

---

### H. Compare / Cycle Workflow

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **CYCLE-01** | Single cycle | Assessment with one cycle only: open compare dropdown. | **None** only (or no false second cycle); no misleading comparison. | Major | |
| **CYCLE-02** | Compare selection | With 2+ cycles: select **Compare With Another Cycle** → pick prior cycle. | Trend/gain indicators update sensibly; no crash. | Major | |
| **CYCLE-03** | New cycle (if used) | Admin/senior: start new cycle per org process. | New cycle active; prior cycle read-only for edits. | Major | Skip if not in Alpha scope. |
| **CYCLE-04** | Historical cycle view | View non-active cycle scores. | Read-only editing; data visible. | Major | |

---

### I. Reports & CSV Exports

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **RPT-01** | Printable report (Chrome) | In **Chrome**: open printable report from assessment. | Report renders client, pack, domains; readable layout. | Blocker | |
| **RPT-02** | Save as PDF (Chrome) | Print dialog → Save as PDF. | PDF complete; no blank/cut-off critical sections. | Major | |
| **RPT-03** | Export matrix CSV | Export matrix CSV from menu. | File downloads; opens in spreadsheet; scores/notes present. | Major | |
| **RPT-04** | Non-Chrome report (spot) | Optional: open report in non-Chrome once. | Document limitation only; do not fail Alpha for Safari quirks if Chrome pass. | Minor | Record for known limitations. |

---

### I2. Learner Map Export

Production routes (hash-based):

- Learner Map: `#/assessment/{assessmentId}/learner-map`
- Export preview: `#/assessment/{assessmentId}/learner-map/export?mode=…`

Export modes: **Standard** (no appendix), **Selected Domains** (filtered appendix), **Full** (all domains appendix).

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **LMAP-01** | Learner Map entry | Open assessment with **≥2 cycles** and scored targets → from **Assessment Matrix**, click **Learner Map**. | Learner Map page opens; header/metadata and **Assessment rollup** render; **Domain Competency Summary** (L1) appears; no crash or blank state. | **Major** (Blocker if AIM requires Learner Map for Alpha sign-off) | Entry button is desktop-width (`sm+`) in matrix header. |
| **LMAP-02** | Export gating | Open Learner Map for assessment with **only 1 cycle** OR **no scored targets**. | **Export Learner Map** disabled; clear helper explains why (e.g. second cycle required / score at least one target). Direct navigation to export preview URL also blocked with unavailable message. | Major | Use two setups if needed. |
| **LMAP-03** | Standard export | Learner Map → **Export Learner Map** → confirm **Standard** default → **Continue to Export Preview**. | Preview opens; **no target-level appendix**; rollup, legends, L1 render; **Print / Save PDF** visible in preview toolbar (`.no-print` chrome). | Major | Estimate shows “No target-level appendix.” |
| **LMAP-04** | Selected Domains export | Choose **Selected Domains** → confirm **zero selected disables Continue** → select **1–2 domains** → Continue. | Standard body renders; appendix title **Appendix — Selected Domain Detail**; **only selected domains** in appendix; **L1 remains assessment-wide** (all domains); selected domain names in preview toolbar. | Major | |
| **LMAP-05** | All-domains nudge | Selected Domains → **Select All**. | Non-blocking warning: all domains selected; Full may be more appropriate; **Continue still enabled** when ≥1 selected. | Minor / Major | Major if copy is unclear or misleading. |
| **LMAP-06** | Full acknowledgment | Choose **Full** mode. | Large-export warning + appendix size estimate; **Continue disabled** until acknowledgment checkbox checked; after check, preview shows **full appendix** for all domains. | Major | Direct URL `?mode=full` bypasses dialog checkbox — note if observed. |
| **LMAP-07** | Print / Save PDF (Chrome) | In **Chrome**, open Learner Map export preview (Standard minimum; spot-check Full) → click **Print / Save PDF** → Save as PDF. | Print dialog opens **only after button click** (no auto-print on load); PDF **excludes** preview toolbar; includes learner/assessment metadata; Standard mode no major cut-off; Full appendix long but readable. | Major | Capture PDF artifact for sign-off record. |
| **LMAP-08** | Clinical metrics sanity | Inspect **Assessment rollup** and **Domain Competency Summary**. | **Assessment Coverage** / **Targets Assessed** use **target-based** denominators; L1 **Coverage** is target-based; **Score Distribution** reflects **latest target state** per domain; **Latest Target Movement** is target-level; no user-facing **Scored Cells**, **Scored Records**, or **Assessment Records** labels. | Major | Qualitative plausibility check vs known scores. |
| **LMAP-09** | Sparse domain appendix | Use assessment where a domain has **no scored targets** → export **Selected Domains** (include that domain) or **Full**. | Unscored domain shows compact empty-state message (e.g. “No targets have been scored in the selected cycles.”); **no** pages of dash-only matrices. | Major | |
| **LMAP-10** | Cycle dates | Open native Learner Map L2 and export appendix for assessment with cycle dates on record. | Cycle rows show **cycle number + date** when available; number-only fallback acceptable when date missing. | Minor / Major | Depends on Alpha data having cycle dates populated. |

**Learner Map — out of scope for this smoke pass**

- Dev-only routes `#/dev/learner-map` / `#/dev/learner-map-export` (optional spot-check for engineering only)
- In-app PDF engine / automatic print on page load
- Export history, saved presets, Report R2 integration
- Exact page-count guarantees (segment estimates are indicative only)

---

### J. Workflow Rhythm / Real Session Simulation

| Test ID | Goal | Steps | Expected Result | Severity if failed | Notes |
|---------|------|-------|-----------------|-------------------|-------|
| **RHYTHM-01** | Full therapist pass | Therapist: client → assessment → score ~25% of targets across 2 domains → notes on 3 targets → submit. | Completes in one sitting without dead ends. | Blocker | |
| **RHYTHM-02** | Full reviewer pass | Reviewer: find submission → adjust 1 score → approve → report; optional spot-check **Learner Map Standard export** (§I2). | Lifecycle complete same day. | Blocker | Learner Map optional unless AIM requires for reviewer workflow. |
| **RHYTHM-03** | Return visit | Next day: reopen client list and approved assessment. | Data intact; read-only where expected. | Major | |
| **RHYTHM-04** | Cognitive clarity | During pass, note any label that implied clinical judgment unsupported by data. | Wording objective (e.g. “At Maximum Score”, “Targets with Score Gains”). | Minor | Qualitative; capture quotes. |

---

## 4. Therapist Workflow Stress Simulation

**Goal:** Simulate a busy session—rapid scoring, modal hopping, domain switches—not to break the app, but to surface **friction**, **fatigue**, and **trust** issues.

**Setup:** One therapist, one in-progress assessment, ≥2 domains with ≥8 targets each, compare enabled if multiple cycles exist.

| Test ID | Activity | Steps | Watch for | Severity if failed | Notes |
|---------|----------|-------|-----------|-------------------|-------|
| **STRESS-01** | Rapid modal scoring | Open modal → score → Next Target → score → repeat 10× without closing. | Correct target each time; no stale notes/scores; no UI lag blocking clicks. | Blocker | |
| **STRESS-02** | Modal ↔ table mix | Alternate: score in table, then same target in modal, then next target in modal. | Table and modal always agree. | Blocker | |
| **STRESS-03** | Score flip-flop | Change same target score 4× quickly (e.g. 2→3→4→2). | Final value persists after refresh; no duplicate rows/errors. | Major | |
| **STRESS-04** | Note while moving | Type note on target 1 → immediate Next → type on target 2 → Previous → check target 1 note. | Each note on correct target; no overwrite. | Blocker | |
| **STRESS-05** | Domain hop | Mid-domain: back to overview → different domain → open modal on first target. | No crash; prior domain scores saved. | Major | |
| **STRESS-06** | Compare while scoring | Enable compare to prior cycle → score several targets → check overview “score gains” card. | Numbers plausible; no negative UI freeze. | Major | |
| **STRESS-07** | Interrupted session | Score half the pack → close tab → reopen assessment 5 min later. | Progress intact; resume obvious. | Blocker | |
| **STRESS-08** | Fatigue audit (qualitative) | After 15 min rapid use, answer: “Would I trust this for a real caseload slot?” | Tester records **Yes / With reservations / No** + 1–2 sentences. | Major | Subjective; required for sign-off. |

**Stress simulation debrief (tester fills in)**

| Question | Response |
|----------|----------|
| Most frustrating step | |
| Any unexpected lock or permission | |
| Modal navigation felt natural? | |
| Would submit without double-checking scores? | |

---

## 5. Critical Alpha Blockers

**Do not go to AIM Alpha clinical use if any of the following are observed (open Blocker without accepted mitigation):**

| # | Blocker category | Example failure |
|---|------------------|-----------------|
| B1 | **Score integrity** | Score saves to wrong target; disappears after refresh; table/modal mismatch. |
| B2 | **Note integrity** | Clinical note on wrong target; stale note when switching targets; note loss on navigate. |
| B3 | **Lifecycle** | Submit does not lock therapist; approve does not lock all roles; cannot complete review path. |
| B4 | **Permissions** | Therapist edits submitted/approved; viewer edits; reviewer cannot edit when policy says they should. |
| B5 | **Authentication / org** | Login broken; user sees wrong org or no data. |
| B6 | **Assessment creation** | Cannot create client or assessment with approved Alpha pack. |
| B7 | **Report (Chrome)** | Printable report blank, wrong client, or unusable for supervisor sign-off. |
| B8 | **Workflow break** | Crash, infinite loading, or cannot exit modal/domain without refresh. |
| B9 | **Wrong pack type** | Checkbox/task-analysis pack used in Alpha session (invalidate test—use numeric/yes-no only). |
| B10 | **Learner Map export** | Wrong client/assessment in export; Standard export blank/unusable; Selected Domains includes wrong domains or breaks L1; Full export omits domains unexpectedly; **Print / Save PDF** does not open print dialog in Chrome; clinical metrics visibly wrong (coverage, latest-state distribution, movement). |

**B10 severity note:** If AIM **requires** Learner Map for first Alpha clinical use, treat B10 failures as **Blocker**. If Learner Map is **optional** for day-one Alpha, treat B10 as **Major** (document and mitigate).

**Major issues (require explicit sign-off to proceed)**

- Confusing but completable submit/unscored flow  
- Compare dropdown misleading with one cycle  
- Export CSV missing scores/notes  
- Save indicator unreliable but data eventually correct  
- Learner Map export issues that do not meet B10 blocker bar (e.g. minor print margin variance, all-domains nudge wording)  
- Full-mode acknowledgment bypass via bookmarked export URL (document; fix in follow-up)  

---

## 6. Final Sign-Off Section

### 6.1 Go / No-Go checklist

| # | Criterion | Pass (☐) | Owner | Date |
|---|-----------|----------|-------|------|
| 1 | Environment confirmed (correct Supabase / URL) | ☐ | | |
| 2 | Alpha pack loaded (numeric + yes/no only) | ☐ | | |
| 3 | All **Blocker** tests in §3 + §4 passed or waived with written approval | ☐ | | |
| 4 | Role matrix (§G) passed on real accounts | ☐ | | |
| 5 | Modal + notes tests (§D, §E, STRESS-01–04) passed | ☐ | | |
| 6 | Lifecycle submit → review → approve (§F) passed | ☐ | | |
| 7 | Chrome Assessment Report + CSV export (§I) passed | ☐ | | |
| 8 | Learner Map **Standard** export passed (LMAP-01, LMAP-03, LMAP-07, LMAP-08) | ☐ | | |
| 9 | Learner Map **Selected Domains** export passed (LMAP-04, LMAP-05) | ☐ | | |
| 10 | Learner Map **Full** export smoke-tested in Chrome (LMAP-06, LMAP-07 spot-check) | ☐ | | |
| 11 | Learner Map metrics sanity check passed (LMAP-08) | ☐ | | |
| 12 | Stress simulation debrief completed (§4) | ☐ | | |
| 13 | Known limitations communicated to AIM (runbook §8) | ☐ | | |

**Decision**

- ☐ **GO** — Proceed to controlled AIM Alpha  
- ☐ **NO-GO** — Blockers remain (list IDs): _______________  

**Signatures (optional)**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA / Tech lead | | | |
| Clinical supervisor | | | |
| Product / Evalis owner | | | |

### 6.2 Operational readiness summary

| Area | Status | Comments |
|------|--------|----------|
| Auth & accounts | ☐ Ready ☐ Not ready | |
| Pack & content | ☐ Ready ☐ Not ready | |
| Therapist workflow | ☐ Ready ☐ Not ready | |
| Reviewer workflow | ☐ Ready ☐ Not ready | |
| Assessment Report / CSV exports | ☐ Ready ☐ Not ready | |
| Learner Map export (§I2) | ☐ Ready ☐ Not ready | Mark N/A if out of Alpha scope. |
| Training materials (runbook distributed) | ☐ Ready ☐ Not ready | |
| Feedback channel defined | ☐ Ready ☐ Not ready | |

**Open issues log (copy for tracker)**

| Test ID | Severity | Summary | Mitigation / owner |
|---------|----------|---------|-------------------|
| | | | |

---

## Appendix — Quick reference

| Role | Submit | Edit submitted | Approve |
|------|--------|----------------|---------|
| Therapist | Yes (own work) | No | No |
| Senior Therapist | Yes | Yes (review) | Yes |
| Admin | Yes | Yes | Yes |
| Viewer | No | No | No |

**Alpha constraints (do not test as in-scope)**

- Checkbox / task-analysis scoring  
- In-app “return to therapist” revision  
- AI features  
- Non-Chrome PDF as primary sign-off path  
- Learner Map dev-only preview routes (unless engineering spot-check)  
- Exact Learner Map page-count prediction (segment estimates only)  

---

## 7. Cursor Execution Notes

This plan is **valid for Cursor-assisted Alpha QA** when the agent has access to the running Alpha app (browser MCP, manual-assisted steps, or human-in-the-loop confirmation).

| Topic | Guidance |
|-------|----------|
| **What Cursor can do** | Navigate hash routes; verify UI elements and labels; exercise export dialog gating; confirm preview modes via URL params; run build/tests in repo; document Pass/Fail per test ID; capture screenshots or saved PDFs when browser tools allow. |
| **What Cursor cannot do alone** | Clinical usability judgment; supervisor sign-off; subjective “trust” assessments (§RHYTHM-04, STRESS-08) — require human clinical reviewer. |
| **Print / PDF** | Use **Google Chrome**. Click **Print / Save PDF** explicitly; confirm print dialog is user-initiated; save PDF artifact for LMAP-07 / RPT-02 evidence. |
| **Data** | Use **synthetic / de-identified** Alpha test clients only. |
| **Learner Map scope** | Confirm with product owner whether B10 is **Blocker** or **Major** before Go/No-Go. |
| **Execution order** | Complete §A–§H and core lifecycle before §I2 (Learner Map requires ≥2 cycles + scored data for positive paths). |
| **Do not execute** | Unless explicitly instructed, this document update does **not** constitute authorization to run the smoke test — only to prepare the plan. |

**Cursor agent result template (per test)**

```
Test ID: LMAP-03
Result: Pass | Fail | N/A
Role: therapist
Browser: Chrome 1xx
Notes: …
Artifact: screenshot/PDF path if applicable
```

---

_End of manual Alpha smoke test plan._

# Full Project State Audit (Updated)

**Audit date:** 2026-05-02  
**Method:** Inspection of repository source (`frontend/src`, `frontend/supabase/migrations`, `database/migrations`, tooling scripts). No runtime deployment verification was performed.

---

## 1. High-Level App Overview

### What the app currently is

- **Client application:** Single-page React app (Vite + TypeScript + Tailwind) branded in the shell as **“Evalis.”** Authentication and data persistence are handled entirely through **`@supabase/supabase-js`** from the browser. There are **no** first-party REST/Edge API handlers in this repository (no `frontend` API routes folder).
- **Primary domain:** Operational workflows for organizations to maintain **clients**, **content packs** (assessment frameworks as JSON-derived structures), **assessments** with **cycles**, **per-target scores**, basic **analytics views**, CSV **exports**, printable **reports**, lightweight **audit log** writes/reads for some actions, and **team invites** mediated by Postgres RPC/tables where deployed.

### What it actually does (verified behavior, not roadmap language)

Organizations can onboard users via signup or invite-derived profile attachment; admins can invite users by email row + manual share link. Users can CRUD-ish clients (within UI role checks); upload or visually build packs; create assessments tied to client + pack; score targets on a matrix UI with cycle-aware score rows; submit and approve assessments; start new cycles after approval constraints; export CSV from the assessments list or from the matrix; view a standalone printable report route; rename the org (admin); view a paginated-style audit table (admin).  

### Who could realistically use it today

- A **development or pilot tenant** comfortable running the Vite client against a configured Supabase project whose database policies and RPC (`check_user_invite`, `claim_invite`, `user_invites`, etc.) match what the frontend expects—not solely the subset of DDL in `frontend/supabase/migrations`.

### Current maturity level (factual characterization)

**Internal MVP-style web client:** Multiple end-to-end paths exist (auth → pack → assessment → scoring → submit/approve → export/report). There are also **explicit gaps or mismatches** (broken hash route from client hub, inconsistent list filtering vs role, conditional UI/backend drift, incomplete scoring surface for some pack types).

---

## 2. Full Page-by-Page Breakdown

Routing is **`window.location.hash`–based**, parsed in ```17:131:frontend/src/App.tsx```.  
There is **no** dedicated `#/login` route when authenticated: unknown hashes fall through ```99:119:frontend/src/App.tsx``` to **Dashboard**.

### Authentication shell (implicit route)

| Field | Detail |
|--------|--------|
| **Page name** | Login / signup |
| **Route** | `#/login` (optional query `?email=`); also shown whenever `useAuth()` has no `user`. |
| **Access** | Unauthenticated visitors. |
| **Purpose** | Email/password **sign-in** and **sign-up**, invite discovery via RPC `check_user_invite`. |
| **UI components** | Form inputs, conditional org-name field, success/error banners. Implemented in ```1:229:frontend/src/pages/Login.tsx```. |
| **User actions** | Toggle signup/signin; submit credentials; prefetch invite context on blur / locked email from URL. |
| **Data deps** | `supabase.auth.signUp/signInWithPassword`; `authService.checkInvite`; `AuthContext.signUp/signIn`. |
| **Current state** | **Working** for flows implemented in ```4:129:frontend/src/services/auth.ts```. Invite handling depends on live RPC/table shape (`claim_invite` / `check_user_invite`). |
| **Notable UX** | Successful sign-up with **no session** (email confirmation path) stays on Login with messaging; otherwise hash forced to `#/dashboard` ```79:79:frontend/src/pages/Login.tsx```. |

---

### Loading / fatal error gates (implicit)

| Field | Detail |
|--------|--------|
| **Page name** | Global bootstrap |
| **Route** | N/A |
| **Access** | All |
| **Purpose** | Covers `loading` state, `AuthContext.error`, redirect unauthenticated sessions off non-login hashes. ```27:73:frontend/src/App.tsx``` |
| **Current state** | **Working UI** — shows spinner or configurable error panel when `error` is set (typically missing env-backed Supabase config). |

---

### Dashboard

| Field | Detail |
|--------|--------|
| **Route** | `#/dashboard` and **default** for unknown hashes when authenticated ```101:119:frontend/src/App.tsx``` |
| **Access** | Any authenticated user with typical profile/org context assumed. |
| **Purpose** | Org-level counts + quick links. ```1:129:frontend/src/pages/Dashboard.tsx``` |
| **UI** | Stat cards; quick actions gated by role string checks; Recent Activity is a **static** placeholder (“No recent activity.”). |
| **Actions** | Navigate via hash routes. |
| **Data deps** | `clientService.getByOrg`, `assessmentService.getByOrg` (default **all** statuses), `packService.getByOrg`. |
| **Current state** | **Working counts** subject to APIs. Recent activity is **占位 UI** (no data wiring). |
| **Notable UX** | If `profile.org_id` missing, stats stay zero after loading ends. |

---

### Clients list

| Field | Detail |
|--------|--------|
| **Route** | `#/clients` |
| **Access** | All roles can view list; create/edit/archive restricted to `admin` / `senior_therapist` in UI ```132:144:frontend/src/pages/Clients.tsx```. |
| **Purpose** | List clients with active/archived filter; create/edit modal form; archive/delete flows. |
| **UI** | Inline form; archive/delete modals; empty state. |
| **Actions** | CRUD via `clientService`; navigate to client detail. |
| **Data deps** | Supabase table `clients`. Optional `auditService.log` on list view ```24:33:frontend/src/pages/Clients.tsx```. |
| **Current state** | **Working UI** conditional on Supabase acceptance of audit payload (non-UUID `entity_id` such as `'list'` may violate UUID column—see Known Issues). |
| **Notable UX** | `Search` icon import is unused—no search field implemented.

---

### Client detail hub

| Field | Detail |
|--------|--------|
| **Route** | `#/client/:id` matched in ```90:96:frontend/src/App.tsx``` |
| **Access** | No extra role gate in UI. |
| **Purpose** | Show client demographics; assessments list; navigate to matrix; delete **draft** assessments. ```13:179:frontend/src/pages/ClientDetail.tsx``` |
| **UI** | Back link; “New Assessment” button; assessments cards; Trash on drafts. |
| **Actions** | **Broken navigation:** `#/create-assessment?client=` is **not implemented** anywhere in `App.tsx` routing ```94:99:frontend/src/pages/ClientDetail.tsx``` → user lands default Dashboard behaviour. Opening existing assessments OK. Draft delete confirms via `ConfirmDialog`. |
| **Data deps** | `clientService.getById`; `assessmentService.getByOrg(profile.org_id)` (**all** statuses) then client-side filter ```24:29:frontend/src/pages/ClientDetail.tsx```. |
| **Current state** | **Partial** — core rendering works; new-assessment CTA incorrect. Draft delete lacks role hiding (viewer/admin distinction not reflected). |

---

### Content packs

| Field | Detail |
|--------|--------|
| **Route** | `#/packs` |
| **Access** | Navigation visible to everyone ```38:44:frontend/src/components/Layout.tsx```. Admin UX for upload/archiving limited to roles `admin` / `senior_therapist` ```10:159:frontend/src/pages/ContentPacks.tsx```. Others still **load and see** pack summaries. |
| **Purpose** | Upload JSON/CSV pack; archive/restore/delete; launch `AssessmentBuilder`. |
| **UI** | `AssessmentBuilder` modal-ish panel; CSV/JSON parsers in `packService`. |
| **Data deps** | `content_packs` table (+ status column per migration `20251213000005_add_pack_status.sql`). Audit insert on upload ```26:34:frontend/src/services/packs.ts```. |
| **Current state** | **Working** for admins/seniors for mutations; pack listing visible org-wide regardless of Dashboard quick-actions copy. CSV parser simplistic `split(',')` – breaks quoted CSV (implementation fact). |

---

### Assessments list + create form

| Field | Detail |
|--------|--------|
| **Route** | `#/assessments` |
| **Access** | Status filter UI + delete icon only for `admin` / `senior_therapist` ```142:386:frontend/src/pages/Assessments.tsx```. Therapists can still open create form from **empty state** path ```289:296:frontend/src/pages/Assessments.tsx```. |
| **Purpose** | Filter org assessments; create new (client + pack + optional assignee + date); open matrix; export CSV; delete assessment (privileged). |
| **UI** | Large create form; list cards; export dropdown; confirm delete. |
| **Data deps** | `assessmentService.getByOrg` with `statusFilter` default `'active'` for everyone ```16:18:frontend/src/pages/Assessments.tsx```; `clientService.getByOrg('active')`; `packService.getByOrg('active')`; `userService.getByOrg`. |
| **Current state** | **Partial** — creation + listing works, but **therapists (and any role without filter UI) stay pinned to `statusFilter='active'`**, which maps to DB statuses `draft` + `in_progress` only ```116:124:frontend/src/services/assessments.ts```. Submitted/approved assessments **disappear** from this page for those users even though they may still exist in data. |
| **Notable UX** | Export from list calls `assessmentService.exportToCSV` which loads **all cycles’ scores** ```435:458:frontend/src/services/assessments.ts``` — differs from matrix export path (see Exports section). |

---

### Assessment matrix (core scoring)

| Field | Detail |
|--------|--------|
| **Route** | `#/assessment/:id` (with Layout) ```81:87:frontend/src/App.tsx``` |
| **Access** | Not route-guarded by role; editability enforced in UI via lock rules. |
| **Purpose** | Two-layer UI: `AssessmentOverview` analytics cards; `DomainScoreboard` per-target scoring; `TargetDetailModal` for notes; submit/approve; start new cycle; exports. Implemented across ```19:587:frontend/src/pages/AssessmentMatrix.tsx``` plus components under `frontend/src/components/assessment/*`. |
| **UI states** | Loading spinner; fatal error message; banners; numerous confirm modals + success modal. |
| **Data deps** | `assessmentService.getById` (scores initially embedded via `scores`?), `getCycles`, `getScores`, `submit`, `finalize`, `startNewCycle`, `updateScore`, `auditService.log` on matrix load ```77:87:frontend/src/pages/AssessmentMatrix.tsx```. |
| **Scoring widgets** | `DomainScoreboard` supports numeric scales (default `[0–4]`) and yes/no; **does not render distinct “checkbox/task-step” grids** — checkbox pack types collapse into numeric-scale UI path ```164:185:frontend/src/components/assessment/DomainScoreboard.tsx``` vs builder creating `checkbox` scoring mode ```115:136:frontend/src/components/AssessmentBuilder.tsx```. Target detail modal persists **notes**, not structured metadata/task analysis rows ```77:92:frontend/src/components/assessment/TargetDetailModal.tsx```. |
| **Cycle UX** | `selectedCycleId` is set programmatically once; UI **does not expose** browsing prior locked cycles except using **comparison ghost scores** dropdown ```384:396:frontend/src/pages/AssessmentMatrix.tsx```. Primary header always labels “Cycle `{currentCycle.cycle_number}`” even if code later diverged — risk if state ever splits. |
| **Current state** | **Working** for primary numeric / yes-no flows assuming score rows contain `id` (otherwise optimistic update skips persistence — see Issues). Workflow rules: Submit locks entire assessment UX when status `submitted` even if conceptual cycle semantics differ (`submit` DB fn does **not** auto-lock cycle rows — comment “TODO”). ```349:382:frontend/src/services/assessments.ts```. Approve invokes `finalize` → DB status `approved` + locks cycles marked `in_progress`. ```385:413:frontend/src/services/assessments.ts```. New cycle button requires prior **approved** state at service layer ```217:225:frontend/src/services/assessments.ts```. |
| **Notable UX** | Debug role switch renders only for literal email `waseh.niazi@gmail.com` ```82:94:frontend/src/components/Layout.tsx``` altering only React state (`debugSetRole`) — no server enforcement change. Duplicate submit entry points (header vs floating footer ```398:407:frontend/src/pages/AssessmentMatrix.tsx``` ```224:230:frontend/src/components/assessment/DomainScoreboard.tsx```). |

---

### Printable report (standalone shell)

| Field | Detail |
|--------|--------|
| **Route** | `#/assessment/:id/report` served **outside** dashboard `Layout` ```75:77:frontend/src/App.tsx``` |
| **Access** | Same SPA auth gate applies (wrapped by `AuthProvider`) — implicit session required. |
| **Purpose** | Print-friendly consolidated report with domain summaries and per-target visuals ```12:222:frontend/src/pages/AssessmentReport.tsx```. |
| **Visual analytics** | Reuses `analyticsService`; trend icons compare scores against previous cycle numeric values with several **fallback-to-zero interpretations** spelled out inline ```176:197:frontend/src/pages/AssessmentReport.tsx``` affecting displayed deltas. |
| **Data deps** | Same services as matrix for assessment + cycles + scores. Uses “active-ish” cycle pick ```39:44:frontend/src/pages/AssessmentReport.tsx``` mirroring Matrix default strategy. |
| **Current state** | **Working** static report page with `window.print()` affordance ```214:220:frontend/src/pages/AssessmentReport.tsx```. |

---

### Team / Users admin

| Field | Detail |
|--------|--------|
| **Route** | `#/users` |
| **Access** | Admin-only rendering gate ```79:87:frontend/src/pages/Users.tsx```; nav likewise ```46:51:frontend/src/components/Layout.tsx```. Non-admin sees restriction panel. |
| **Purpose** | List org profiles; invites table; mutate roles + active/inactive statuses; revoke invites; copy magic link + basic `mailto` helper. ```9:327:frontend/src/pages/Users.tsx``` |
| **Data deps** | Tables `user_profiles`, `user_invites` (+ RPC not invoked here besides invite insert). Uses `navigator.clipboard`. |
| **Current state** | **Working** client-side workflows given DB permissiveness. Invite flow **does not** call Supabase email APIs—manual distribution only. Viewer role cannot be invited via select (only admin/senior/therapist options) ```143:144:frontend/src/pages/Users.tsx``` but type system still includes `viewer` elsewhere (`types/index.ts`). |

---

### Org settings

| Field | Detail |
|--------|--------|
| **Route** | `#/org-settings` |
| **Access** | Admin-only UI + blocked message otherwise ```63:65:frontend/src/pages/OrgSettings.tsx```. Desktop nav exposes link; mobile nav **omits Org & Audit shortcuts** entirely ```122:146:frontend/src/components/Layout.tsx```. |
| **Purpose** | Rename organization (`organizations.name`). Writes audit row with **`entity_type: 'user'`** while describing org rename ```49:52:frontend/src/pages/OrgSettings.tsx``` — misleading classification for consumers of logs. |

---

### Audit log

| Field | Detail |
|--------|--------|
| **Route** | `#/audit-log` |
| **Access** | Admin-only gate ```41:43:frontend/src/pages/AuditLog.tsx``` |
| **Purpose** | Table last `100` chronological events with JSON-stringified `details` column inline ```73:107:frontend/src/pages/AuditLog.tsx```. |
| **Data deps** | `audit_logs` via `auditService.getLogs`. |
| **Current state** | **Working viewer** modulo RLS visibility. Rows may include heterogeneous `action` strings (`VIEW`, `APPROVE`, `CYCLE_START`, etc.) ```334:379:frontend/src/services/assessments.ts```; chip coloring only recognizes subset ```90:96:frontend/src/pages/AuditLog.tsx```. |

---

### Account settings

| Field | Detail |
|--------|--------|
| **Route** | `#/settings` |
| **Purpose** | Two tabs → `ProfileForm` (name editing) ```1:159:frontend/src/components/settings/ProfileForm.tsx```, `SecurityForm` password rotation via `supabase.auth.updateUser` ```1:134:frontend/src/components/settings/SecurityForm.tsx```. |
| **Current state** | **Working**. Profile Organization display is placeholder text `"Organization Member"` ```107:117:frontend/src/components/settings/ProfileForm.tsx``` (no fetch of org name despite field layout). |

---

### Global chrome (Layout/footer)

| Field | Detail |
|--------|--------|
| **Purpose** | Top navigation buttons; logout sets hash to login ```13:175:frontend/src/components/Layout.tsx``` |
| **Footer** | Buttons “Privacy Policy / Terms” have **no `href`s or handlers** ```161:169:frontend/src/components/Layout.tsx``` — placeholders. Displays static “PHIPA Compliant.” |

---

## 3. Navigation & User Flows

All flows below are reconstructed strictly from SPA navigation + services.

### Onboarding (cold org)

1. User opens app → redirected to `#/login` when unauthenticated ```27:30:frontend/src/App.tsx```.  
2. Sign-up inserts auth user → if immediate session exists, `claim_invite` OR create `organizations` row then insert `user_profiles` ```26:65:frontend/src/services/auth.ts```.  
3. **Email confirmation gated path**: returns message early without profile linkage until later session exists ```19:23:frontend/src/services/auth.ts``` → user stays logged-out until verifying (Supabase-managed).  

**Break/clarity:** Subsequent login still runs late invite claim attempts ```74:94:frontend/src/services/auth.ts``` tolerating RPC array vs JSON shapes inconsistently (`signUp` vs `signIn`).  

### Invite flow

1. Admin inserts into `user_invites` (`userService.inviteUser`) ```53:58:frontend/src/services/users.ts```.  
2. Admin distributes link assembled as `${origin}/#/login?email=` ```284:285:frontend/src/pages/Users.tsx```.  
3. Signup/login triggers `claim_invite` deleting row server-side ```226:242:database/migrations/20260104_complete_database_definition.sql``` (referenced snapshot in repo—not guaranteed applied).  

**Broken / unclear:** Frontend Team UI is admin-only, while authoritative SQL snapshot’s `Manage invites` policy also names `senior_therapist` roles ```177:179:database/migrations/20260104_complete_database_definition.sql```—UI does not expose the capability to seniors.

### Client creation → assessment creation

Working path expects user to `#/clients` then add client (privileged). Assessment creation intended via `#/assessments`.  
**Broken shortcut:** `#/create-assessment?client=` from Client Detail incorrectly routed ```94:99:frontend/src/pages/ClientDetail.tsx```.

### Scoring flow

Assessment creation seeds `assessment_cycles` Cycle 1 and bulk inserts `assessment_scores` rows ```52:71:frontend/src/services/assessments.ts```. Matrix loads cycles, binds active `in_progress` if present ```120:122:frontend/src/pages/AssessmentMatrix.tsx```, swaps scores dataset per `selectedCycleId` ```139:164:frontend/src/pages/AssessmentMatrix.tsx```. Persist path requires `scoreRecord.id` ```252:258:frontend/src/pages/AssessmentMatrix.tsx``` — newly pushed optimistic rows without DB ids **won’t persist** if ever missing IDs.

### Review / approve

Therapist submits (available while status `draft|in_progress` and lock rules satisfied) invoking `submit` ```349:379:frontend/src/services/assessments.ts```. Admin/Senior approves via Matrix calling `finalize` ```315:324:frontend/src/pages/AssessmentMatrix.tsx``` locking active cycle rows ```407:411:frontend/src/services/assessments.ts```.  

Start new cycle enforces prerequisite `assessment.status === 'approved'` ```217:225:frontend/src/services/assessments.ts``` then resets parent assessment row to `'in_progress'` for continued work ```252:261:frontend/src/services/assessments.ts```.

### Export / report flows

Assessment list CSV export → `exportToCSV` server fetch all scores ```435:458:frontend/src/services/assessments.ts```.

Matrix/export menu uses in-memory **`scores`** for currently loaded cycle ```447:459:frontend/src/pages/AssessmentMatrix.tsx``` diverging dataset scope.

Standalone report `#/…/report` opens new tab via `window.open` ```438:440:frontend/src/pages/AssessmentMatrix.tsx``` relying on SPA hash routing inside new browser tab context.

---

## 4. Feature Inventory

Legend: **Code loc** refers to strongest reference.

| Feature | What it does | Where | Missing / Incomplete / Risks |
|--------|----------------|-------|------------------------------|
| Email/password authentication | Wrapper over Supabase auth session | ```4:129:frontend/src/services/auth.ts``` `AuthContext.tsx` | No MFA/forgot-password UI in codebase. |
| Invite discovery | Reads invite metadata by email RPC | Login + RPC usage ```125:129:frontend/src/services/auth.ts``` | Depends on functions existing in deployed DB (`check_user_invite` variant returning `org_name` per `database/migrations/20260106_update_rpc.sql`). |
| Profile bootstrap | Upsert profile/org membership | Auth service | Profiles optional error swallowing yields null profiles but still “logged-in” shell possible (partial error handling paths). |
| Clients CRUD + archive/delete | Org-scoped listings + forms | `clients.ts`, `Clients.tsx` | Therapist cannot add clients (OK by UI); Viewer sees delete UI on drafts in client detail unintentionally likely. |
| Content packs ingest | JSON upload, CSV shim, audit log | `packs.ts`, `ContentPacks.tsx`, `AssessmentBuilder.tsx` | CSV grammar naive; checkbox scoring types authored in builder not mirrored in scorer; no licence proof attachment UI (`licence_proof_url` unused clientside). |
| Assessment lifecycle | Draft creation, duplication guard (client+pack), assignee/date fields | ```96:117:frontend/src/pages/Assessments.tsx``` | Status vocabulary includes `draft` + `in_progress` at RESTful filter though creation always inserts `draft` ```18:29:frontend/src/services/assessments.ts``` (`in_progress` enters later via cycle reset pathway). |
| Cycles | Table & foreign keys seeded per migration snapshots | DDL in `frontend/supabase/migrations/20251212000000_add_cycles.sql` + fuller snapshot `database/migrations/20260104_complete_database_definition.sql`. | Migrating orphan historical scores lacks automated backfill in repo migrations (“DO NOT RUN BACKFILL HERE” comment). |
| Scoring | Numeric + yes/no toggle grid; notes | Scoreboard + modal | Checkbox/task-analysis JSON stored at DB column `metadata` is **never written** via current UI (only typed parameter exists in service). Evidence files JSON column unused UI-wise. |
| Analytics panels | Percentages, narratives, acquisitions | `analyticsService` invoked from overview/report/matrix | Heavy `console.log` noise in calculations ```54:71:frontend/src/services/analytics.ts```; `targetsMastered` always `0` in cycle stats aggregation ```101:103:frontend/src/services/analytics.ts```. Several extended analytics helpers (cycle comparison regressions narratives) unused in rendered pages (dead capability). |
| Dashboard activity | Intended feed | `Dashboard.tsx` | Hard-coded empty placeholder. |
| Audit logging | Best-effort insert + admin listing | ```13:56:frontend/src/services/audit.ts``` | Non-fatal swallowing on failures; enum mismatch in TypeScript restricts some actions compared to inserts actually used (`APPROVE`, `CYCLE_START`, `VIEW` etc.). Potential UUID coercion failures for inventive `entity_id` strings. |
| Team management | Admin controls | `Users.tsx`, `users.ts` | No server-side transactional email invites. |
| Debug role spoof | Local swap of profile role enum | Layout email gate ```82:93:frontend/src/components/Layout.tsx``` | **Security gap:** adjusts only frontend display & client-side branching; unrelated to Postgres RLS. |
| Scripts (offline) | JSON test pack generators | `/scripts/generate_test_pack.js` | Not wired into hosted app UX. |

---

## 5. Data Model & Architecture

### Architectural facts

- SPA talks **directly** to Supabase with anon key exposed via Vite env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) ```1:13:frontend/src/lib/supabase.ts``` — security delegated to Postgres RLS in deployed schemas.
- There is **no** Node/BFF abstraction in `frontend/` for domain logic besides Supabase triggers/RPC envisioned in SQL assets.

### Schema sources (potential drift)

Two parallel truths exist:

1. **Supabase CLI migrations** under `frontend/supabase/migrations/*.sql` (create base tables; add statuses; cycles; audit policies; metadata column etc.). User invite tables / RPC **`check_user_invite`/`claim_invite` are absent** here (searched filenames & contents).  
2. **Canonical snapshot & patches** under `database/migrations/` such as ```22:246:database/migrations/20260104_complete_database_definition.sql``` (excerpt representative of full snapshot) plus dated patches like `database/migrations/20260106_update_rpc.sql`, `database/migrations/20260107_add_user_status.sql`.

Operational reality equals **whatever was applied last** on the Supabase project—codebase alone cannot unify them authoritatively.

### Tables / entities evidenced in code SELECT/INSERT targets

Tables actively referenced:

- `organizations` — via org service + signup path.
- `user_profiles`.
- `user_invites`.
- `clients`.
- `content_packs`.
- `assessments`.
- `assessment_cycles`.
- `assessment_scores`.
- `audit_logs`.

Supporting compatibility view **`users`** as alias projection of `user_profiles` appears in DDL (`20251210000000_fill_missing_schema.sql`). Policies in some migrations refer to `(SELECT org_id FROM users WHERE id = auth.uid())` ```7:41:frontend/supabase/migrations/20251212000000_add_cycles.sql`.

### Key relationships

- `organizations` 1‑N core tenant tables (`user_profiles`, `clients`, packs, assessments, cycles, audits).  
- `assessments` references both `clients` & `content_packs`; stores **`pack_snapshot` JSON**.  
- `assessment_cycles` referencing `assessments`; `assessment_scores` referencing `assessments` + optional FK to cycles (added migration).  
- `assigned_to`, `approved_by` reference auth identities at DB layer.

### Stored vs computed

- **Stored:** Row-level scores (`score`, `note`, `metadata`, `evidence_files`, auditing columns). Snapshot JSON persists framework structure duplicates from pack upload time.  
- **Computed:** All analytics percentages in `analyticsService`; CSV generation reconstructs rows merging pack snapshot + normalized score rows (`exportUtils`).

### Inconsistency / duplication facts

| Area | Observation |
|------|-------------|
| DDL duplication | Repeated `CREATE TABLE IF NOT EXISTS` blocks between `create_base_schema` & `fill_missing_schema` risking policy drift execution order. |
| Policy models | Older policies subselect from `users` view vs newer snapshot using `get_my_org_id()` security definer. Not reconciled programmatically here. |
| Type vs DB | TS `AssessmentScore.pack_snapshot_id: string` while some DDL uses UUID text hybrid; inserts set `pack_snapshot_id: assessment.id` string usage ```59:61:frontend/src/services/assessments.ts```. |
| AuthContext duplication | Duplicate `signOut` method signature erroneously duplicated in typing ```12:15:frontend/src/context/AuthContext.tsx``` (noise / potential TS looseness elsewhere). |

---

## 6. Roles & Permissions (Actual Behavior)

### Declared roles (Type layer)

`'admin' | 'senior_therapist' | 'therapist' | 'viewer'` enumerated ```1:1:frontend/src/types/index.ts```.

### UI-level enforcement snapshots

| Surface | Enforcement mechanism |
|---------|-----------------------|
| Layout nav | Shows Team / Org / Audit only if `profile.role === 'admin'` ```46:63:frontend/src/components/Layout.tsx``` |
| Dashboard quick tiles | Inclusion arrays for role strings ```78:117:frontend/src/pages/Dashboard.tsx``` |
| Clients editing | Buttons limited to admins/seniors (not therapists) ```132:145:frontend/src/pages/Clients.tsx``` |
| Packs authoring | Mutation controls limited to admins/seniors though read remains broad ```126:159:frontend/src/pages/ContentPacks.tsx``` |
| Assessments list | Filter toolbar + destructive delete guarded to admins/seniors; creation header button likewise but empty-state loophole grants therapists UI to create (`setShowForm(true)`) ```289:296:frontend/src/pages/Assessments.tsx``` |
| Matrix edits | Locks for `viewer`; locks when cycle not `in_progress` OR assessment finalized states ```214:217:frontend/src/pages/AssessmentMatrix.tsx``` ```347:348:frontend/src/pages/AssessmentMatrix.tsx``` |

### Backend enforcement

All authoritative writes pass through Supabase REST with policies defined in whichever SQL revisions were deployed. **This repository cannot assert final RLS parity** beyond listing intended fragments (older broad `Manage assessments/scores … for ALL` clauses appear in snapshots vs some migrations). Application code assumes org isolation works.

### Gaps vs intent (factual deltas)

| Gap | Manifestation |
|-----|---------------|
| Non-admin therapists lack assessment status filter UI → stuck view subset | Assessments listing described above. |
| Viewer draft delete surfaces | Lack of conditional rendering on destructive affordances in Client Detail (`Trash2`). |
| Debug role override | Frontend-only mutated role for UX experiments. |
| Invites manageable in SQL for seniors | UI restricts to admin-only screen. |

---

## 7. Analysis & Reporting

### In-app quantitative views

| Location | Computation source | Displays |
|---------|---------------------|----------|
| Matrix overview (`AssessmentOverview`) | `analyticsService.calculateDomainStats`, `calculateCycleStats`, narrative `generateNarrative`, local completeness derivation ```14:103:frontend/src/components/assessment/AssessmentOverview.tsx``` | Percent bars, qualitative bullet lists (“Clinical Insights”). |
| Matrix scoreboard mastery filter | Threshold `score >= 4` ```52:52:frontend/src/components/assessment/DomainScoreboard.tsx``` irrespective of individualized mastery definitions in pack scaling. |
| Assessment report printable | recomputes domain stats + simplistic bar widths ```63:206:frontend/src/pages/AssessmentReport.tsx``` comparing against previous-cycle numbers with zero fallbacks flagged inline in logic. |

### Logging side effects during analysis viewing

Opening matrix writes `auditService.log` with `action: 'VIEW'` ```77:87:frontend/src/pages/AssessmentMatrix.tsx```.

### Visible limitations tied to implementations

| Limitation | Supporting fact |
|-----------|----------------|
| Checkbox targets treated like numeric ladders | Rendering path lumps non-yes/no into scale buttons ```164:185:frontend/src/components/assessment/DomainScoreboard.tsx``` ignoring `checkbox` branching. |
| Cycle-level aggregate “targets mastered” placeholder | Returned constant zero ```101:103:frontend/src/services/analytics.ts```. |
| Compare acquisition heuristic | Depends on positivity & strict greater-than prior score ```133:146:frontend/src/services/analytics.ts```. |

---

## 8. Export System

### Formats shipped

Both major paths rely on **`exportUtils.generateCSV`** constructing `.csv` with client naming prefix ```8:21:frontend/src/utils/exportUtils.ts``` plus download via Blob anchor.

Variants:

1. **Long / “Analytics” CSV** (`format: 'long'`) — emits one row per **score row** including cycle number lookup via joined data ```25:94:frontend/src/utils/exportUtils.ts```.
2. **Matrix wide CSV** (`format: 'matrix'`) — pivots enumerated cycles discovered from joined `score.cycle.cycle_number` ```99:175:frontend/src/utils/exportUtils.ts```.

Assessment list triggers export through service path that gathers **ALL** scores for assessment regardless of presently focused cycle ```446:457:frontend/src/services/assessments.ts```.

Assessment matrix invocation passes current in-memory **`scores`** array scoped to fetched cycle loads ```446:459:frontend/src/pages/AssessmentMatrix.tsx``` mismatching assessments page export cardinality.

Filename pattern uses ISO date substring and underscores; includes assessor IDs raw (UUIDs surface) ```88:93:frontend/src/utils/exportUtils.ts```.

Printable PDF is outside repo implementation—browser print converts DOM.

### Alignment risks (factual)

- Long export rows duplicate targets across cycles logically correctly but UI matrix view filters single cycle scores—human comparing matrix screen vs emailed long export may misunderstand scope unless instructed.  
- Matrix export derives cycle columns only from cycles represented in aggregated score payloads—missing cycle rows propagate empties silently.

---

## 9. Known Issues & Technical Debt

**(Only observations—no corrective prescriptions per audit charter.)**

| ID | Observation |
|----|----------------|
| Broken route | `#/create-assessment?client=` referenced but never routed. |
| Audit payload integrity | Calls like `auditService.log` with `entity_id: 'list'` may violate UUID column DDL (depends on deployed schema nullability/coercion)—failures swallowed ```35:39:frontend/src/services/audit.ts```. |
| Duplicate export semantics | List vs matrix exports pull different subsets of underlying score rows (`assessmentService.exportToCSV` vs matrix `exportUtils` call). ```435:458:frontend/src/services/assessments.ts``` ```446:459:frontend/src/pages/AssessmentMatrix.tsx``` |
| Therapist assessments list blind spot | Locked `statusFilter='active'` without UI to widen for non-privileged roles. |
| Checkbox scoring mismatch | Builder can author checkbox scoring; scorer UI lacks equivalent fidelity. |
| Cycle navigation | Cannot explicitly select prior cycle as working context — only comparative ghost layering. |
| Metadata / evidence columns | Persisted columns exist (`metadata`, `evidence_files`) yet UI never sets `metadata` nor uploads storage objects (no `.storage` API usage grep). |
| Analytics logging noise / perf | Repeated `console.log` per scoring target computations in production pathways ```54:71:frontend/src/services/analytics.ts```. |
| Dead / partial analytics functions | Narrative/regression helpers beyond those consumed remain unused code surface area ```241:289:frontend/src/services/analytics.ts```. |
| Documentation drift | ~~Repo root README historically claimed Next.js;~~ README now documents **Vite + React (TypeScript)** SPA hash router; verify any external copies of the audit still reflect current docs. |
| Global footer legal links | ~~Previously non-functional;~~ `Layout.tsx` footer now links to `#/privacy` and `#/terms` (verify in-tree). |
| Mobile admin navigation incompleteness | Org & Audit routes unreachable from condensed menu ```122:145:frontend/src/components/Layout.tsx```. |
| Title branding mismatch | Resolved in-tree: `frontend/index.html` documents **Evalis — ABA Assessment Platform** (`<title>`). |

---

## 10. MVP Readiness Assessment (FACTUAL)

### MVP-ready pillars (assuming Supabase DDL + RLS aligns with exercised queries)

Direct Supabase-connected flows for authenticated multi-user org workloads: authenticated sessions, invites (row + RPC when present), client records, templated frameworks, seeded assessment score rows per creation, iterative scoring UX, gated submission approvals, downloadable CSV artifacts, printable HTML report rendering, foundational audit ingestion & admin-only review screen.

### Blockers / severe risks for real clinic usage grounded in codebase facts

| Risk category | Supporting fact |
|---------------|----------------|
| Operational schema divergence | Frontend migrations incompletely model invite RPC system; reliance on supplemental SQL snapshots means a fresh migrate-only environment may lack required functions tables. |
| Misleading navigation pathways | Broken client-level “New Assessment” shortcut route. |
| Permission / PHI governance transparency | Frontend-only debug role spoof for specific personal email demonstrates UI trust boundaries are not authoritative. Audit logging best-effort and sometimes mislabels entity taxonomy for org rename. |
| Therapist operational blind spots post-submit | Assessments landing page hides submitted/approved from roles lacking filter ribbon. |

### Incomplete but still usable facets

Structured checkbox/task analytic scoring fidelity; longitudinal cycle browsing in UI parity with DB; exhaustive audit coverage of every mutation pathway; consolidated analytics noise control; parity between export contexts.

### Items that must be reconciled externally before asserting production posture

Unified authoritative migration path; validated RLS matrix vs UI expectations; verification that UUID-typed audit columns accept only valid UUID payloads for all instrumentation sites; elimination or formalization of debug-only constructs if external threat model demands it.


---

_End of audited factual inventory._

What we’re building (in one line)
A role-based web app that digitizes ABLLS-style assessments: therapists score targets (0–4) in-app → the skills matrix auto-colors by cycle → supervisors review/lock → one-click reports. This replaces paper scoring and Excel coloring entirely, while laying a data foundation for future AI insights.
“ABLLS-compatible”, not “ABLLS”
We do not ship ABLLS content. Clinics upload or compose their own “Content Packs” (domains, targets, instructions, success criteria). Our app is a neutral scoring & reporting layer that works with ABLLS-like structures and other skill frameworks. Each assigned assessment uses a snapshot version of that content pack for auditability.

Roles, permissions, and high-level flows
Admin (one per org) – ops & configuration: users, org settings, billing, security, and Assessment Content Management when the clinic wants Admin to own it.
Senior Therapist (BCBA/clinical lead) – manages clients, assigns assessments, can also conduct assessments, reviews and locks results, and generates reports.
Therapist – runs assessments and records scores for assigned clients only.
Client (record only) – no login; a data entity with demographics, assignment, history, matrix, graphs, and report archive.
Access hierarchy and scope are strictly role-based.

Shared authentication (all roles)
Login → 2) Role redirect → Admin / Senior Therapist / Therapist dashboards. (MFA optional per org policy.)



ADMIN – pages & workflows
A1. Admin Dashboard
Purpose: at-a-glance org status.
Quick stats: Active Users, Active Clients, Assessments in Progress.


Shortcuts: Manage Users, Organization Settings, Billing.
 Path: Login → /admin/dashboard


A2. User Management
Purpose: CRUD users (Senior Therapists, Therapists; Clients are records but can be created here too).
 UI: table with search/filter by role, kebab actions (Edit / Deactivate).
 Primary actions:
Add New User (modal: Name, Email, Role) → creates account tagged with org_id + role.


Edit → update role/status. Deactivate → soft disable.
 Path: Admin Dashboard → Manage Users (/admin/users)
 Cited responsibilities & workflow.


A3. Organization Settings
Purpose: global clinic config.
Org name/logo/contact, time zone, language.


Cycle Colors (e.g., Cycle 1 = Yellow, Cycle 2 = Blue, Cycle 3 = Green).


Assessment defaults (interval, due date offsets).


Export templates (logo/watermark).
 Path: Admin Dashboard → Settings (/admin/settings)
 (General settings supported in recap.)


A4. Assessment Content Management (Admin-owned)

 Pages (sub-section):
A4.1 Content Packs List – all packs, versions, status (Draft/Published).


A4.2 Pack Editor – define Domains (A–J…), Targets (A1, A2…), with Instructions, Success Criteria, Scoring rules (0–4 + No-Opp), Materials, Examples. (ABLLS example provided but builder should support all aba assessments).


A4.3 Import CSV – map CSV columns to Domain/Target/Instruction/Criteria.


A4.4 Versioning & Publish – “Save Draft”, “Publish vX.Y” (immutable snapshot).


A4.5 Pack Permissions – who can assign/use this pack (Senior Therapists).
 Paths:


Admin Dashboard → Content (/admin/content)


Content → New Pack (/admin/content/new)


Content → {Pack} Editor (/admin/content/{id})
 These mechanics (packs, versioning, domains/targets content) align with the recap’s content-pack model.


A5. Billing & Subscription
Purpose: plan, invoices, next renewal; upgrade/downgrade; invoice history.
 Path: Admin Dashboard → Billing (/admin/billing)
A6. Data Security
Purpose: transparency for clinics: encryption, residency, audit, compliance.
Encryption: TLS 1.2+ in transit; AES-256 at rest.


Access Control: RBAC + org isolation.


Audit Trail: user/IP/timestamp/entity.


Data Residency: CA (ca-central-1).
 Path: Admin Dashboard → Security (/admin/security)



SENIOR THERAPIST – pages & workflows
S1. Senior Dashboard
Purpose: live clinical picture.
 Widgets: Ongoing Assessments, Assessments Due (calendar), Recently Completed, Notifications.
 Paths:
Add Client → S2


Assign Assessment → S4


View Reports → S7



S2. Client Management
Purpose: client list & creation.
Add New Client (Name, DOB, ID, Assigned Therapists).
 Path: Senior Dashboard → Clients (/senior/clients)


S3. Client Profile
Tabs:
Overview – demographics, assigned staff, progress graphs.


Assessments – list by cycle color, % complete, dates.


Reports – downloadable history.
 Path: Clients → {Client} (/senior/clients/{id}) (tabs as routes)


S4. Assessment Assignment (Builder)
Purpose: create an Assessment Instance.
 Steps:
Select Content Pack + Version (from Admin/Senior packs).


Choose Client + Therapist(s).


Set cycle color & due date.


Assign → notify therapist + create record linked to content_pack_id.
 Path: Senior Dashboard → Assign Assessment (/senior/assessments/new)


S5. Senior Content Management
identical to A4.x, but scoped to Senior. (Toggled per clinic policy.)


S6. Conduct Assessment (Senior can run)
When needed, Senior Therapists can open an assigned assessment and enter scores exactly like Therapists (targets, 0–4/No-Opp, notes, evidence).
 Path: Client → Assessment → Start/Continue
 (Explicitly acknowledging they can also perform assessments.)
S7. Assessment Review
Purpose: verify & lock.
Cycle View / Score View toggle.


Inline edits (with audit trail).


Approve & Lock → freezes scores; enables exports.
 Path: Client → Assessments → {Assessment} → Review


S8. Reports
Purpose: longitudinal insights and export.
Compare Cycle 1 (Yellow) vs Cycle 2 (Blue) vs Cycle 3 (Green).


Mastery gains, regressions, domain summaries.


Export PDF/CSV (with clinic branding).
 Path: Client → Reports or Senior Dashboard → Reports



THERAPIST – pages & workflows
T1. Therapist Dashboard
Purpose: daily work.
My Clients, Ongoing Assessments, Due Soon, Notifications.


Quick action: Continue Assessment.


T2. Client Management (Therapist scope)
Search/sort; each card shows last assessment & status.
 Path: Therapist Dashboard → Clients (/therapist/clients)
T3. Client Profile (Therapist View)
Tabs: Overview, Current Assessment, History.
T4. Assessment Page (scoring)
Core screen (the one in your Figma):
Domain list (A–J).


Target card shows Question/Prompt, Instructions, Success Criteria, Materials, Examples, and 0–4 bar + No Opportunity, Notes, (optional) Evidence upload.


Previous/Next Target navigation.
 Behavior: Auto-save each score; auto-fill matrix cell; update domain % and completion %.


Scoring semantics: 0–4 scale + No-Opp; app replaces Excel coloring and updates in real time.
T5. Reports (Therapist)
Auto summary (Mastered/Emerging/Untested), progress per domain (charts), Export PDF/CSV.
 Path: Client → Reports or Therapist Dashboard → Reports
T6. Notifications (shared)
Assignments, due dates, review feedback.
 Path: bell icon → /notifications
T7. Settings (shared)
Profile, password, notification prefs, theme.

Data handling & security (developer notes)
Auto-save + audit: every score save is timestamped with user ID; all edits/exports recorded to an audit log.


Matrix auto-fill: each saved score updates the correct cell and color in the matrix, domain % and overall %.


RBAC + org isolation; content versioning freezes the pack used by an assessment; PHIPA/PIPEDA-grade encryption (TLS 1.2+; AES-256).


Data residency: Canada (AWS ca-central-1).


PII minimization: store only what’s necessary.



Page inventory (for Figma handoff)
Authentication (shared):
Login, Forgot Password, Reset Confirmation → role redirect.


Admin:
Dashboard (A1)


User Management (A2)


Organization Settings (A3)


Assessment Content Management (A4.1–A4.5)


Billing & Subscription (A5)


Data Security (A6)


Senior Therapist:
Dashboard (S1)


Client Management (S2)


Client Profile (S3)


Assessment Assignment (S4)


(Optional) Content Management (S5, if enabled)


Conduct Assessment (S6)


Assessment Review (S7)


Reports (S8)


Therapist:
Dashboard (T1)


Client Management (T2)


Client Profile (T3)


Assessment Page (T4)


Reports (T5)


Notifications (T6)


Settings (T7)



Typical button-to-page paths (examples)
Admin → “Manage Users” → /admin/users → “Add New User” (modal) → Save.


Admin → “Content” → /admin/content → “New Pack” → Editor → “Publish v1.0”.


Senior → “Assign Assessment” → /senior/assessments/new → select Content Pack vX.Y → assign Therapist → Save → Therapist notified.


Therapist → Dashboard → “Continue” → Domain list → Target card → select 0–4/No-Opp → Next Target → matrix auto-fills.


Senior → Client → Assessment → Review → inline fixes → Approve & Lock → Export PDF/CSV. 


# ABA Skills Assessment Platform – Master Specification Document (For All Agents)

This document is the primary source of truth for all autonomous agents collaborating on the ABA Skills Assessment Platform.
Every agent must read, understand, and follow the specifications, constraints, and goals described here.

This platform exists to digitize the paper-pencil assessment process used in ABA therapy while respecting copyright, privacy, and organizational boundaries.

Agents should use this specification along with all research files stored under:

docs/research/


Every agent must continuously reference both locations when generating code, analysis, documentation, or architectural decisions.

-------------------------------------------------------------
1. Purpose & Vision
-------------------------------------------------------------

The ABA Skills Assessment Platform is designed to provide ABA clinics, therapy centers, and educational programs with a digital system for completing skills assessments such as:

ABLLS-R

VB-MAPP

AFLS

EFL

(future expansion) PEAK, Vineland, custom assessments

The key focus of the MVP is:

Replacing paper-and-pencil scoring with a digital, compliant, user-friendly workflow.

The system:

Does not include copyrighted content.

Allows users to **build assessments manually** via a GUI or upload generic CSVs.

Provides role-based workflows for clinics.

Ensures PHIPA/PIPEDA/HIPAA-style privacy controls.

Stores assessments, scoring, notes, and exports.

Scales to large organizations and multiple assessment types.

Future phases will expand into:

Analytics

Mastery automation

Progress graphs

AI recommendation systems

Machine learning integrations

Clinic-wide reporting and dashboards

Agents must design all architecture so this future scalability is possible.

-------------------------------------------------------------
2. Core Roles & Actors
-------------------------------------------------------------

The platform exists within multi-organization, multi-role environments.
No agent should ever design flows that mix data between organizations.

Roles include:
Role	Responsibilities
Organization Admin	Manages users, roles, learners, frameworks, and assessments
Supervisor/BCBA	Reviews, adjusts, and finalizes assessments
Therapist/RBT/Instructor	Completes assigned assessments and enters scores
Parent (future)	Limited view access to progress summaries
System Service Layer (Agents)	Enforces privacy, architecture, and data integrity

Agents must assume:

Least privilege principles

Per-organization data isolation

Strict enforcement of RLS and authorization

-------------------------------------------------------------
3. MVP Scope (Phase 1 — Required by All Agents)
-------------------------------------------------------------

The MVP's goal is to completely replace paper-pencil scoring while ensuring compliance.

All agents must prioritize:

✔ User authentication
✔ Role-based authorization
✔ Multi-organization tenancy
✔ Assessment framework uploads (CSV/XLSX)
✔ Digital scoring workflows
✔ Saving structured scores + notes
✔ Supervisor review and finalize
✔ Exporting (CSV / XLSX / PDF lite)
✔ Clean and accessible UI
✔ Secure database structure with RLS

Agents must not implement copyrighted content.
Frameworks must always be uploaded by the clinic.

-------------------------------------------------------------
4. Assessment Framework Structure
-------------------------------------------------------------

The platform uses a **Native Content Builder** approach.

Users (Admin/Senior Therapists) create "Content Packs" in the app which contain:

- Domains (e.g., "Visual Perception")
- Targets (e.g., "Matches identical pictures")
- Target Metadata:
  - Materials Needed
  - Success Criteria
  - Examples
  - Instructions
- Scoring Logic (Per Target):
  - Numeric (0-2, 0-4, etc.)
  - Yes/No
  - Checkbox count
  - Text observation

**Import Options**: Users may import CSV files for bulk entry, but the primary creator to the **Assessment Builder GUI**.

The platform stores this as a JSON structure in the `content_packs` table.


The platform only stores:

Structure

IDs

Max values

Domain mapping

This is legally compliant.

Agents generating validation code must never enforce or imply proprietary item text.

-------------------------------------------------------------
5. Full**Refined Data Model (Cycles)**
- **Assessment**: A long-lived container linking a Client to a Content Pack.
- **Assessment Cycle**: A specific instance of testing (e.g., "Initial", "6-Month Review").
  - `start_date`, `end_date`, `status` (In Progress, Locked).
  - Scores are attached to a Cycle, allowing longitudinal tracking.

6.3 Assessment Workflow
-------------------------------------------------------------
1. **Assign**: Senior Therapist links Client to Pack (creates `Assessment`).
2. **Start Cycle**: System creates `AssessmentCycle` (Cycle 1).
3. **Score**: Therapist enters scores for Cycle 1.
4. **Lock**: Senior Therapist approves Cycle 1.
5. **Re-Assess**: System creates `AssessmentCycle` (Cycle 2). Scores default to empty or carry-over (configurable).

**Matrix / Visualization**:
The app **DOES NOT** generate the copyrighted grid.
The app exports data (CSV) which can be pasted into the User's Excel Template to generate the visual matrix. Details (Title, Description).

Adds Domains.

Adds Targets to Domains (defining Title, Criteria, Materials, Scoring).

Saves/Publishes the "Content Pack".

5.2 Assigning an Assessment

Fields:

learner_id

framework_id

assigned_to (therapist)

due_date

notes

System generates:

assessment_id

5.3 Therapist Scoring Interface

UI Requirements:

Domain tab navigation

List of items per domain

Input field for each score

Validation: 0 ≤ score ≤ max_score

Optional notes per item

Autosave behavior

Skip functionality

Progress indicator

Database Requirements:

Insert or upsert score

Link score → assessment_id → item_id → learner_id → organization_id

No score is permanently locked until Supervisor finalization.

5.4 Supervisor Review & Finalization

Aggregate view

Ability to revise any item score

Comments field

Finalize button (locks assessment)

Completed timestamp

After finalization:

Assessment becomes read-only

Exports enabled

5.5 Exporting (MVP)

Agents handling exports must support:

CSV export

XLSX export

Minimal PDF summary export (non-branded)

-------------------------------------------------------------
6. Page-by-Page Application Breakdown
-------------------------------------------------------------

Agents generating UI or routing must follow this structure.

6.1 Login

Supabase auth

Email/password

Error handling

Role detection → redirect

6.2 Organization Dashboard

Number of learners

Number of in-progress assessments

Quick actions:

Add learner

Add user

Upload framework

6.3 Learner Management

List view

Add learner modal

Learner profile page

Assessment history table

Assign assessment button

6.4 Content Pack Management

List of existing packs

"Build Custom" button (opens Builder)

"Upload CSV" button

Assessment Builder UI:
- Form for metadata
- Dynamic list of Domains
- Nested dynamic list of Targets
- Scoring configuration per target

Validation messages

Save into DB

6.5 Assessment Assignment Page

Select learner

Select framework

Select domains (optional filter)

Assign therapist

Save assignment

6.6 Assessment Scoring Page

Domain sidebar

Item list

Score inputs

Notes

Auto-save indicator

Save & next domain

6.7 Supervisor Review Page

Global summary

Domain-by-domain review

Edit scores inline

Finalize button

6.8 Assessment Export Page

List of available formats

Export history

-------------------------------------------------------------
7. Data Model (High-Level Schema Requirements)
-------------------------------------------------------------

Agents modifying backend/database should follow this structure.

Core Entities

organizations

users

roles

learners

frameworks

framework_domains

framework_items

assessments

assessment_scores

Security Requirements

Row Level Security enabled on all PHI tables

Every row has an organization_id

No cross-organization reads/writes

No PHI in logs or URL params

End-to-end least-privilege enforcement

Agents MUST ensure:

⚠️ Every query includes organization_id filters
⚠️ No broad SELECT * without RLS
⚠️ No exposure of internal IDs to unauthorized roles

-------------------------------------------------------------
8. Privacy, Security & Compliance Requirements
-------------------------------------------------------------

Agents must design everything according to:

PHIPA (Ontario)

PIPEDA (Canada)

HIPAA-style requirements

Even if not legally required, the system must behave as if it is.

Security Rules for All Agents

No storing copyrighted content

No storing unnecessary PHI

PHI must be encrypted at rest (Supabase default)

Only Admins can manage users

No role can access other organizations

Parents cannot edit assessments

Logs must exclude PHI

Exports must be secure

Agents must reference research documents under:

docs/research/privacy/
docs/research/copyright/


Whenever performing any decision-making.

-------------------------------------------------------------
9. System Architecture Requirements
-------------------------------------------------------------
Frontend

Next.js

React

Tailwind

Supabase client

Vite environment variables

Backend

Supabase database (primary)

RLS-based access layer

(Python Backend Deprecated/Removed)

Prisma or SQL-based migrations

Storage

Supabase storage buckets (private)

Framework template files stored per-organization

Agents must ensure:

Architecture is modular

Functions are testable

Files are logically structured

Naming conventions are consistent

-------------------------------------------------------------
10. Future Development Phases (Agents Must Design for Scalability)
-------------------------------------------------------------

Even if not implemented soon, agents must design the system to allow:

Phase 2

Analytics dashboard

Mastery automation

Comparison reports

Graphs and progress charts

Phase 3

Reinforcement tracking

Program tracking

Task analysis automation

Advanced PDF reports

Phase 4

Machine learning integrations

Behavior prediction

Treatment optimization suggestions

Multi-clinic enterprise SaaS

Agents must ensure today’s code does not block future features.

-------------------------------------------------------------
11. Agent Operating Principles
-------------------------------------------------------------

Every agent in the workspace must adhere to the following rules:

1️⃣ Always read this file first, and re-read on every new task.
2️⃣ Always read all files in docs/research/* before making decisions.
3️⃣ Never create copyrighted content or embed assessment text.
4️⃣ Always enforce organization-level data isolation.
5️⃣ Always validate user roles before performing actions.
6️⃣ Design all functions to be modular and extensible.
7️⃣ Assume future integration with AI/ML components.
8️⃣ Communicate with other agents through clear, documented outputs.
9️⃣ Ensure all work supports both MVP and long-term scalability.

These rules apply globally to ALL agents.
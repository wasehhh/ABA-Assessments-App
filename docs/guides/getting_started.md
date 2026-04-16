# Getting Started & Onboarding

Welcome to the ABA Skills Assessment Platform! This document helps new team members (and agents) understand the project context and how to contribute effectively.

## 🌍 The Mission

We are building a platform to help ABA clinics move from paper-based assessments to a digital workflow. Our key differentiator is **Compliance** and **Copyright Respect**. We do not hardcode assessment questions; we build the *engine* for clinics to upload them securely.

## 🏗️ Project Structure

- **`docs/`**: The brain of the project.
    - `specs/`: The absolute source of truth. Start with `master_app_specification.md`.
    - `architecture/`: Technical decisions and diagrams.
    - `research/`: Why we made certain decisions (legal, clinical).
- **`frontend/`**: The Next.js web application.
- **`supabase/`**: Database migrations and custom functions.

## 🔑 Key Concepts

### 1. Multi-Tenancy
Every piec of data belongs to an **Organization**. We use Row Level Security (RLS) in Postgres to ensure one clinic never sees another's data.
**Rule:** Always verify `organization_id` in your queries.

### 2. "Frameworks" not "Tests"
We don't build "The ABLLS App". We build a **Framework Engine**.
- A **Framework** is a structure (Domains -> Items).
- Users create "Content Packs" in the **Native Builder** or upload a CSV.
- We store the scores against that structure.

### 3. Agent Workflow
If you are an AI agent working here:
1.  **Read Specs:** Check `docs/specs/master_app_specification.md`.
2.  **Plan:** Create an `implementation_plan.md` in your artifacts.
3.  **Execute:** Write code, keeping files small and modular.
4.  **Verify:** Test your changes.
5.  **Document:** Update these docs if you change the system behavior.

## 🚀 First Steps

1.  Follow the [Setup Guide](setup_guide.md) to get your environment ready.
2.  Read the [System Overview](../architecture/system_overview.md) to understand the stack.
3.  Pick a task from the active sprint or user request!

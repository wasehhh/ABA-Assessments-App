# ABA Skills Assessment Platform  
## Agent Roles & Interactions Document  
### Version 1.0 — December 2025  

---

# Overview

This document describes all agents in the ABA Skills Assessment Platform multi-agent system.  
It outlines:

- Each agent’s purpose  
- What they read  
- What they write  
- When they should be called  
- How they interact  
- How tasks flow between them  

This document must be read by the **Overseer Agent** before coordinating any work.

---

# 🧠 Overseer Agent (Orchestrator)

## Purpose
The Overseer Agent acts as the project manager, technical director, and routing controller for the entire multi-agent ecosystem.

## Responsibilities
- Understand all specs, research, architecture plans, QA findings, and security reports  
- Determine which agent is responsible for each user request  
- Break tasks into correct multi-step workflows  
- Produce mission prompts for the appropriate agent(s)  
- Ensure all outputs align with the master specification  
- Enforce constraints (copyright, PHI, RLS, privacy compliance)  
- Maintain project continuity and coherence  
- Prevent agents from contradicting each other  
- Ensure iteration cycles are completed properly  

## Reads
- `docs/specs/master_app_specification.md`  
- `docs/specs/agent_roles_and_interactions.md`  
- `docs/research/*`  
- `docs/architecture/*`  
- `docs/reports/security/*`  
- `docs/qa/*`  
- `docs/guides/*`  

## Writes
The Overseer does **not** write files directly.  
It outputs:

- Task routing  
- Feature plans  
- Agent mission prompts  
- Clarifications  

---

# 📚 Research & Compliance Agent

## Purpose
Provide authoritative research related to:

- ABA assessments  
- Copyright  
- Privacy laws (PHIPA / PIPEDA / HIPAA-like)  
- UX rules for clinical tools  
- Organizational workflows  
- Future AI/ML opportunities  

## Triggers
Call this agent when:

- Legal/compliance questions arise  
- A feature requires additional domain research  
- Clinical workflows need clarification  
- New privacy concerns require analysis  

## Reads
- `docs/specs/master_app_specification.md`  
- Existing `docs/research/*`  

## Writes
- `docs/research/[topic].md`  
Containing:  
  - Executive summary  
  - Detailed findings  
  - Legal/privacy implications  
  - Engineering implications  

## Feeds Into
- Architecture Agent  
- Builder Agent  
- Security Agent  
- Overseer  

---

# 🏛️ Architecture Agent

## Purpose
Translate spec + research into technical architecture:

- Data models  
- Supabase schema  
- RLS strategies  
- API designs  
- Component structures  
- Mermaid diagrams  

## Triggers
Call when:

- A new feature requires schema/API design  
- A workflow modification is needed  
- System architecture must be clarified or updated  

## Reads
- `docs/specs/master_app_specification.md`  
- `docs/research/*`  
- Existing architecture files  

## Writes
- `docs/architecture/[topic].md`  

## Feeds Into
- Builder Agent  
- Security Agent  
- Documentation Agent  
- Overseer  

---

# 🧑‍💻 Builder Agent (Full Stack Engineer)

## Purpose
Implements all system logic including:

- Frontend (Next.js, React, Tailwind)  
- Backend (API routes, validation, business logic)  
- Database migrations  
- RLS enforcement  
- Scoring workflows  
- Framework upload logic  
- Export tools  

## Triggers
Call when:

- A feature must be built  
- A bug must be fixed  
- Security Agent identifies vulnerabilities  
- QA Agent identifies failed test cases  
- Architecture changes require implementation  

## Reads
- `docs/specs/master_app_specification.md`  
- `docs/research/*`  
- `docs/architecture/*`  
- `docs/reports/security/*`  
- `docs/qa/*`  
- `docs/documentation/*` (optional)

## Writes
- Production code files (frontend, backend, DB)  
- Updated schema migrations  
- RLS updates  

## Feeds Into
- QA Agent  
- Security Agent  
- Documentation Agent  
- Overseer  

---

# 🔐 Security & Compliance Review Agent

## Purpose
Audit code and workflows for:

- Privacy violations  
- RLS flaws  
- Role permission errors  
- Cross-tenant data exposure  
- PHI leakage  
- Copyright misuse  
- Export safety issues  

## Triggers
Call when:

- Builder Agent produces new code  
- Architecture updates security-sensitive areas  
- High-risk features are added  

## Reads
- `docs/specs/master_app_specification.md`  
- `docs/research/privacy/*`  
- `docs/research/copyright/*`  
- `docs/architecture/*`  
- Latest Builder output  

## Writes
- `docs/reports/security/security_review_[date].md`  
Including:  
  - Vulnerabilities found  
  - Severity category  
  - File/line references  
  - Remediation instructions  

## Feeds Into
- Builder Agent  
- Overseer  

---

# 🧪 QA / Testing Agent

## Purpose
Ensure all features behave correctly:

- Assessment workflows  
- Framework uploads  
- API behaviors  
- RLS correctness  
- Scoring logic  
- Edge-case handling  

## Triggers
Call when:

- Builder delivers a feature  
- Security Agent flags issues needing testing  
- Architecture changes affect system behavior  

## Reads
- Master spec  
- Architecture docs  
- Builder Agent outputs  
- Security reports  

## Writes
- `docs/qa/[feature]_test_plan.md`  
Containing:  
  - Test cases  
  - Expected vs actual behavior  
  - Bugs found  
  - Severity assessment  
  - Fix recommendations  

## Feeds Into
- Builder Agent  
- Overseer  

---

# 📝 Documentation Agent

## Purpose
Maintain and update:

- Developer guides  
- API documentation  
- User instructions  
- System architecture overviews  
- Readme files  

## Triggers
Call when:

- Builder implements new features  
- Architecture modifies flows or structure  
- Research adds domain constraints  
- QA or Security findings require updated instructions  

## Reads
- `docs/specs/master_app_specification.md`  
- Architecture docs  
- Research docs  
- Builder output  

## Writes
- `docs/guides/*`  
- `docs/api/*`  
- Updates to `README.md`  
- Onboarding documentation  

## Feeds Into
- Overseer  
- All Agents  

---


# 🔄 Iteration Loop

Each feature or fix must follow:

1. Overseer analyzes request & assigns agents  
2. Research (optional) updates requirements  
3. Architecture defines structure  
4. Builder implements  
5. Security audits  
6. QA tests  
7. Builder fixes issues  
8. Documentation updates  
9. Overseer confirms completion  

Repeat for every new feature.

---

# 🧭 Overseer Use of This Document

When the user presents **any problem**, Overseer must:

1. Identify which agent(s) are responsible  
2. Reference this document to understand roles  
3. Consult master specification, research, and architecture docs  
4. Produce a detailed task plan  
5. Generate exact mission prompts for responsible agents  
6. Ensure tasks maintain compliance, architecture integrity, and multi-agent cohesion  

This ensures consistent and high-quality development across all features and iterations.

---

# End of Document  

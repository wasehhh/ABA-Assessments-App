# Mission: Tech Debt & Documentation Cleanup (Documentation Agent)

**Role**: Documentation Agent
**Context**: Resulting from the "Native Builder" pivot, the Python Backend (`/backend`) has been deleted.
**Objective**: Update all documentation to remove references to Python, FastAPI, and Excel parsing.

## 1. Scope
-   `README.md`
-   `docs/architecture/`
-   `docs/setup/`

## 2. Tasks

### Task A: README.md
1.  Remove "Backend Setup" instructions (Python/Pip).
2.  Remove "Features: Excel Import".
3.  Update "Stack": Remove FastAPI/Python. Add "Supabase Edge Functions" (if applicable, or just Client-Side).

### Task B: Architecture Docs
1.  **Update** `docs/architecture/tech_stack.md`: Mark Python as Removed.
2.  **Update** `docs/architecture/api_architecture.md`: Clarify that the app is Client-Side + Supabase.

### Task C: Developer Guides
1.  **Update** `docs/setup/installation_guide.md`: Remove Python installation steps. simplify to `npm install && npm run dev`.

## 3. Output
-   Updated Markdown files.
-   Commit message suggestion: "docs: remove deprecated backend references".

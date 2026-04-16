# Developer Setup Guide

This guide details how to set up the development environment for the ABA Skills Assessment Platform.

## 1. Prerequisites

Ensure you have the following installed:
- **Git**
- **Node.js** (v20 or higher) & **npm**

- **Supabase CLI** (for local DB management)
- **VS Code** (recommended)

## 2. Repository Setup

Clone the repository and navigate to the root directory:

```bash
git clone <your-repo-url>
cd DomainA_Tool
```

## 3. Backend Setup (Supabase)

The project uses Supabase for the database, auth, and storage.

1.  **Login to Supabase CLI:**
    ```bash
    supabase login
    ```
2.  **Start Local Supabase:**
    ```bash
    supabase start
    ```
    This will spin up a local Postgres instance, Studio, and API gateway. Note the `API URL` and `anon key` output.

3.  **Link to Remote Project (Optional):**
    If deploying or syncing with production:
    ```bash
    supabase link --project-ref <your-project-id>
    ```

## 4. Frontend Setup (Next.js)

1.  **Navigate to frontend:**
    ```bash
    cd frontend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    Create a `.env.local` file in the `frontend` directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
    ```
4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The app should be running at `http://localhost:3000`.



## 6. Verification

- Open `http://localhost:3000`.
- Try logging in (if local Supabase is running, check the Studio at `http://localhost:54323` for user management).
- Verify database connection by checking if data loads on the dashboard.

## Troubleshooting

- **Supabase Start Fails:** Ensure Docker is running.
- **npm install errors:** Check Node version `node -v`.

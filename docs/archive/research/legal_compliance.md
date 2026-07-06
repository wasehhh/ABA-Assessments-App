# Research: Legal & Privacy Compliance (Canada/Ontario)

## Executive Summary
Operating a health app in Ontario requires strict adherence to PHIPA (provincial) and PIPEDA (federal). The platform acts as an **Electronic Service Provider (Agent)** to the Clinic (Health Information Custodian). Data residency (Canada), encryption, and immutable audit logs are critical requirements.

## Detailed Findings

### PHIPA (Personal Health Information Protection Act)
*   **Role:** The App is an "Agent". The Clinic is the "Custodian".
*   **Responsibility:** We must ensure the security and integrity of PHI (Personal Health Information) but generally act on the instructions of the Custodian.
*   **Breach:** We must notify the Custodian of any breach immediately, who then notifies the patient/commissioner.

### PIPEDA
*   Applies to the *commercial* aspects of the business.
*   Requires valid consent, purpose limitation, and safeguard measures.

### HIPAA (USA)
*   While not law in Canada, most Canadian clinics view "HIPAA Compliance" as a gold standard for security features (audit logs, encryption, timeouts).

## Legal & Privacy Implications
*   **Data Residency:** Strongly recommended to host in **AWS Canada (Central)** or **Azure Canada** to satisfy extensive public sector procurement policies in Ontario.
*   **Agreements:** A Data Processing Agreement (DPA) is mandatory between us and every clinic.

## Engineering Implications
*   **Encryption:** At rest (DB/Storage) and in transit (TLS 1.2+).
*   **Audit Logging:** strictly mandated. Must log `Who`, `What`, `When` for every PHI access.
    *   *Implementation:* Middleware that captures `user_id` accessing `learner_profile` or `assessment_score`.
*   **Data Isolation:** Row-Level Security (RLS) is the best technical enforcement mechanism for multi-tenancy.

## Risks & Recommendations
*   **Risk:** Storing data in US regions (e.g., Vercel default US-East).
*   **Recommendation:** Use strict region pinning. Ensure Vercel functions (if used) don't cache PHI edges working outside Canada if possible, or accept the risk (lesser than DB storage).

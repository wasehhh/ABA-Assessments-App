# Evalis — Alpha testing runbook

For staff using Evalis during the AIM Alpha. Read **Before You Start** and **Important Notes** first.

---

## 1. Overview

**What Evalis is**  
Evalis is a web-based tool for running ABA-style assessments: you work with **clients**, choose an **assessment pack**, enter **scores** over one or more **cycles**, and can **submit**, **review**, and **approve** work. You can also **print or save a report** and **export** data in some places.

**Purpose of Alpha**  
We want to see whether Evalis **fits real clinical workflow** in your setting and whether the main path is **clear and usable** for experienced staff.

**What we are testing**  
- Day-to-day usability (labels, steps, and whether the flow makes sense)  
- Whether the **core workflow** (client → assessment → scoring → submit → review → approve → report) works for you  
- What feels **confusing**, **missing**, or **awkward** so we can improve it  

**What we are NOT testing**  
- Every possible edge case or future feature  
- “Final” product quality or regulatory sign-off  
- Non-core extras (for example, advanced analytics, parent portal, or full mobile optimization)

---

## 2. Who should use this

- **Therapists** — day-to-day scoring, saving work, and submitting for review.  
- **Senior therapists / supervisors** — reviewing submitted work, making corrections if your role allows, approving, and helping others follow this runbook.

If your role in Evalis is **view-only**, use the app only as your organization directs; you may not see all steps below.

---

## 3. Before you start

**Login (high level)**  
Use the **login page** you were given. Sign in with the **email and password** your organization set up. If you use an **invite link** first, follow the instructions on screen. If login fails, **stop** and contact your **internal Evalis contact** (do not share passwords in email or chat).

**Environment**  
- You are using a **test / Alpha** version of the product.  
- **Data** may be reset or limited; treat it as **not** for real protected health information unless your organization has explicitly said otherwise.  
- **One organization** at a time per login (your org’s workspace).

**Browser**  
- **Google Chrome** is **required** for **printing** the report and for **Save as PDF** from the report.  
- Other browsers may work for general use, but **do not** rely on them for reports during Alpha.

---

## 4. Important notes (constraints)

Please follow these during Alpha so results are comparable and safe for this phase:

| Topic | What to know |
|--------|----------------|
| **Pack types** | Use **numeric** and **yes/no** packs only. **Do not** build or run assessments from **checkbox** or **task-analysis** packs during Alpha. |
| **After submit** | Once an assessment is **submitted**, **therapists** cannot change scores in the app. **Reviewers** (senior therapist / admin roles) **can** edit **submitted** work during review. |
| **After approve** | Once an assessment is **approved**, it should be **locked** — no further editing through the normal screens. |
| **Revision workflow** | There is **no** “send back to therapist for corrections” button or workflow yet. If changes are needed, your team will need to agree **outside the app** how to handle it for Alpha. |
| **Reports** | Use **Chrome** for printing and Save as PDF. |
| **If something looks wrong** | **Do not** invent workarounds that hide the problem. **Note what happened** and report it (see **Feedback**). |

---

## 5. Test workflow (step-by-step)

Use this as a **guided walkthrough**. Exact labels may say “Evalis” or your org’s wording.

1. **Create or open a client**  
   Add a client if needed, or open an existing client from your client list.

2. **Create an assessment**  
   Start a new assessment for that client and attach a **numeric or yes/no** pack (see constraints above).

3. **Enter scores**  
   Work through the scoring screen for the **current cycle** as you normally would clinically.

4. **Save progress**  
   Save so your work is not lost before you are ready to submit.

5. **Submit the assessment**  
   When the draft is ready for review, **submit** it. After this step, **therapists** should expect **no further editing** unless your process says otherwise outside the app.

6. **Reviewer opens and reviews**  
   A **senior therapist or supervisor** (with the right role) opens the **submitted** assessment and reviews it.

7. **Reviewer edits if needed**  
   If your organization allows, the reviewer may **correct or adjust** the submitted assessment **before approval**.

8. **Approve the assessment**  
   When satisfied, the reviewer **approves** the assessment. After approval, everyone should treat it as **final** for Alpha purposes.

9. **Export / report**  
   Use **Chrome** to open the **printable report** and print or **Save as PDF** as needed. Use any **export** options your screens offer, keeping in mind what your trainer explained about scope.

---

## 6. What to pay attention to

While you work, notice:

- Was **anything confusing** (words, order of steps, or where to click)?  
- Was **anything unclear** (what a status means, what happens next)?  
- Did **anything not behave** the way you expected?  
- Did the workflow feel **natural** for how you work today?

Jot short notes as you go; you can expand them in feedback.

---

## 7. Feedback

Your feedback drives improvements. You do **not** need perfect wording.

Please share:

- **What worked well** — steps that felt smooth or clear.  
- **What was confusing** — screens, labels, or steps that slowed you down.  
- **What felt missing** — something you expected from a clinical tool that was not there.  
- **Bugs or issues** — something broke, an error appeared, or data looked wrong (say **what you clicked** and **what you saw**).

Send feedback through the channel your **AIM / Evalis contact** provides (for example, a form, email template, or meeting).

---

## 8. Known limitations (Alpha)

These are expected for this phase; they are **not** bugs to “fix” by workaround:

- **Printing / PDF:** **Chrome only** for reliable report printing and Save as PDF.  
- **Pack types:** **No** checkbox or task-analysis packs for Alpha.  
- **Revision:** **No** in-app “return to therapist for edits” after submit — only reviewer roles can edit **submitted** work before approval, per your org’s rules.  
- **Safeguards:** Rules such as who can edit after submit are enforced **in the application** for Alpha. A future production system may add **stronger backend rules**; do not assume this Alpha build matches long-term compliance architecture.

---

_End of runbook._

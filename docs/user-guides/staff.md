# Staff user guide

Draft · November 2, 2026 · Story #51 / Task #75

This section is for a **Firefighter** account. Administrator instructions are
in the [separate administrator guide](administrator.md). The available access
below was checked against navigation, page guards and backend permissions in
`dev` commit `74ae952`; a live firefighter walkthrough is still required.

## S01 — Sign in and understand your available pages — Available

1. Obtain an active department account through the department's administrator. The current staff registration form is a prototype and does not create an account; do not rely on its access-code fields.
2. Follow [C01 — Sign in](account.md#c01--sign-in) with your department email and password.
3. On **Home**, read **Department portal / Authorized personnel access**.
4. Open navigation. A firefighter has **Home** and **Profile**, plus the account and **Sign out** controls. On a phone, select **Open navigation** first.

Expected result: you reach the informational department landing page. Although
its text refers to managing assessments and reviewing updates, the reviewed
build does not expose a firefighter assessment browser or review queue.
**Users** and **Hazard map** appear only for administrators. Do not interpret
the Home page's invitation or registration-code text as a working account-creation process.

Firefighters cannot manage users or approve/send back homeowner evidence.
The assessment service allows authorized staff to read assessment data and crew
photos, but a general firefighter browsing screen is not available in this build.
The homeowner area redirects staff to the department area. Ask the department
administrator if the available pages do not meet your assigned work.

Screenshot S01: pending real firefighter desktop and phone navigation and Home captures.

## View your profile and maintain your account — Available

1. Follow [C02 — Profile](account.md#c02--view-and-update-your-profile) to review your role and department details and update your name or phone.
2. If your employee or station details are incorrect, ask the administrator to correct them; your Profile page displays them without editing controls.
3. Follow [C03 — Password](account.md#c03--change-your-password) to replace your password.
4. Follow [C04 — Sign out](account.md#c04--sign-out) when finished.

Expected result: your profile changes show **Saved** and a password change shows
**Password updated. Other devices have been signed out.** Screenshot placeholders
C02–C04 cover these screens. Sign-in and profile errors and their recovery steps
are listed in the shared account instructions.

## Continue field work in ArcGIS and Survey123

1. Continue inspections and crew photo capture through the department's existing ArcGIS and Survey123 process.
2. Use the portal only for the information and actions your role exposes. Do not attempt to replace field uploads with the planned homeowner fix-photo form.
3. Report missing or unexpected imported records/photos to the department administrator for investigation.

Expected result: field work continues in the existing tools. The portal reads
the City's exported inspection data and photos after import; it does not write
changes back to ArcGIS or refresh automatically from it. This guide does not
change or document the department's separate field procedures.

The planned review workflow (#39) is administrator-only. Firefighters remain
read-only for assessment review and do not clear issues. See the shared
[limitations](README.md#what-the-portal-does-not-do) for the remaining sprint boundaries.

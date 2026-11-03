# Portal user guides

Drafted November 2, 2026 · Story #51 · Task #75

Choose the guide for your account:

- [Homeowner guide](homeowner.md): registration, connected properties, inspections and planned follow-up actions.
- [Administrator guide](administrator.md): accounts, the hazard map and planned review and request workflows.
- [Shared account instructions](account.md): sign in, profile, password and sign out for every role.

## Draft status

Instructions marked **Available** were checked against `dev` commit `74ae952`,
and the two-role changes of November 3, 2026 against the code that made them.
This was a source review, not a live screen walkthrough. A **Planned** section
describes a Sprint 5 workflow whose screen is absent from that build; do not
try those steps yet. Planned button names, confirmations and errors must be
checked when the feature merges. They are not confirmed screen text.

The scope of task #75 is the written draft. Dated screenshots, an independent
teammate walkthrough and final screen verification belong to the follow-up
finalization task. Story #51 is not complete until those checks pass.

## How to use these guides

Open the portal address provided by the department. Paths such as `/sign-in`
refer to pages on that site; no public deployment address is assumed here.
Use the sidebar to move between pages. On a phone, select the menu button
labelled **Open navigation** to reveal the same navigation and sign-out action.
Quoted messages in Available sections are the current application wording.

Homeowner accounts may be labelled **Resident** on administrator screens.
The portal has two roles, **Resident** and **Admin**. A missing menu item may
mean your role cannot use it.

## What the portal does not do

- It does not send email or text alerts for fix submissions or requests.
- This sprint supports the 2026 dataset. Earlier-season history and repeat-hazard views are outside this guide.
- It does not have a live ArcGIS connection. Assessment records and crew photos are imported from the City's supplied export.
- Field work and original crew photo capture remain in ArcGIS and Survey123. Field crews do not have portal accounts.
- It does not provide a separate corrective-action guidance service. Read the inspection notes; ask the department if a finding is unclear.
- QR entry links, scheduling full-assessment visits and reopening closed issues are outside the planned workflows.

## Screenshot and walkthrough handoff

Each procedure has a screenshot ID. In the finalization task, replace its
placeholder with a dated capture of the real application, using demonstration
accounts and data. Keep the first capture as well as the final capture; do not
overwrite the initial layout. Suggested filenames are
`H03-initial-2026-11-02.png` and `H03-final-YYYY-MM-DD.png`. Use the actual
capture date and record the build commit, role and desktop/phone view with it.
No screenshot files have been created in this draft.

| IDs | Screens to capture |
| --- | --- |
| C01–C04 | Sign in, personal details, password, sign out/mobile navigation |
| H01–H04 | Homeowner registration, rejected Asset ID, connected properties, assessment and enlarged crew photo |
| H05–H07 | Fix submission, status/history with sent-back reason, full-assessment request |
| A01–A04 | Users list, user edit panel, disable confirmation, linked properties |
| A05–A06 | Hazard map/list with filters and counts, saved views |
| A08–A09 | Review queue and decision, full-assessment requests |

Finalization must include an independent teammate running every Available
procedure and each Planned procedure after release, without coaching. Record
tester, date, build, role, actual outcome and corrections; do not mark a
procedure verified just because its source was read.

## Source review notes for finalization

These notes help the next editor reconcile the sprint proposal with the build;
they are not extra user actions.

- `frontend/src/components/layout/nav-config.ts` and the role checks in the
  Users and hazard-map hooks restrict those pages to administrators.
- `frontend/src/features/admin/components/user-details-fields.tsx` and
  `linked-assets-editor.tsx` allow administrators to edit email and property
  links. The sprint proposal excluded those actions; this draft follows the code.
- `frontend/src/features/profile/components/password-form.tsx`,
  `backend/app/services/profile_service.py` and the session check in
  `backend/app/api/deps.py` implement password-change session invalidation.
  The older proposal said other sessions would remain open; this draft follows the code.
- `backend/app/services/admin_hazard_service.py` currently assigns **Open**
  to every hazard. Real pending/closed transitions depend on #44 and #39.
- #38, #44, #45 and #39 workflows are not present in this build. Their draft steps need final labels, actual
  success/error text and the team's confirmation of proposed rules.

Common error text was checked in the authentication routes and the frontend
auth, assessment, profile and administrator error helpers. Finalization must
still exercise the real screens, including expired sessions and phone layouts.

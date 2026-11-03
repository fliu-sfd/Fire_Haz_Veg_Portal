# Portal user guides

User documentation · Story #51 · Tasks #75 and #76

Choose the guide for your account:

- [Homeowner guide](homeowner.md): registration, connected properties, inspections and planned follow-up actions.
- [Administrator guide](administrator.md): accounts, the hazard map and planned review and request workflows.
- [Shared account instructions](account.md): sign in, profile, password and sign out for every role.

## Release and validation status

Updated November 3, 2026 · Story #51 · Draft task #75 / finalization task #76.

The available procedures and screenshots use the real application at `dev`
commit `208bfcd`, with all six database migrations applied. **Planned** sections
cover features absent from that build. Their proposed steps and labels must
be checked after release; they are not working controls in the current portal.

This update finalizes the guide for the available build. Full story #51 acceptance
still requires screenshots of the unmerged features and an independent teammate
walkthrough. No teammate sign-off is claimed here.

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

## Screenshot record

All images are dated November 3, 2026 and show Chrome on the actual Next.js
frontend and FastAPI API backed by an isolated PostGIS database. No API responses
were mocked. Names, emails, Asset IDs, findings and map points are demonstration
data, not City records. The protected image explicitly identifies itself as a
demonstration image rather than an inspection photograph. Counts illustrate the
demo database, not production totals. No real door tag was supplied.

Desktop captures use a 1440 × 1000 viewport; full-page images may be taller.
Phone captures use 390 × 844. C01–C04 and H01–H04 use the Resident role;
A01–A07 use Admin. The captured build is `208bfcd` throughout. A07 shows
promoting an existing account; its command-line bootstrap has no portal screen.

The seven first homeowner/sign-in captures are retained unchanged. The earlier
#75 submission contained written drafts, with no initial screen images. No
historical layout was reconstructed. These are the first captured layouts;
retain them in Git when adding screenshots from later builds instead of
claiming that a newly captured screen represents an earlier design.

| Procedures | Evidence |
| --- | --- |
| C01 | Sign-in failure with the exact invalid-credentials message |
| C02–C03 | Saved homeowner profile and password-change success |
| C04 | Phone navigation with Profile and Sign out |
| H01–H03 | Registration, rejected Asset ID and connected property card |
| H04 | Two inspection points, protected demonstration image and inaccessible-property message |
| A01–A04 | Users search, saved edit panel, disable confirmation and linked-property editing |
| A05–A06 | Desktop hazard workspace, empty search, phone filters and saved-view form |

Images are embedded beside their procedures. Screenshot captions describe the
state actually captured; an error mentioned in a table is not automatically
claimed as a separate screenshot.

## Walkthrough results

Validation date: November 3, 2026. Build: `208bfcd`. Method: scripted Chrome
browser walkthrough and explicit API permission/session checks against the real
local backend. This is implementation-side verification, not an independent
teammate review. Temporary browser scripts, database fixtures, dependencies and
credentials are excluded from the repository.

| Procedure | Checks and outcome |
| --- | --- |
| C01, H01–H03 | Passed: invalid sign-in, rejected unknown Asset ID, successful registration, automatic sign-in and connected property display. |
| H04 | Passed: multiple findings, displayed notes and image loading, protected image opening in a new tab. Unknown and another homeowner's property both show the same unavailable message. |
| C02 | Passed: saved Phone change and Reset restored the saved value. |
| C03 | Passed: mismatched confirmation, wrong current password, successful change and rejection of the other session with 401. |
| C04 | Passed: phone navigation, sign-out redirect, sign-in with the new password and redirect away from administrator pages for a homeowner. |
| A01–A04 | Passed: filtered user lookup, saved phone edit, unknown-ID error, immediate link/unlink, disable confirmation, disabled sign-in refused with 403, and reactivation. |
| A05–A06 | Passed: hazard workspace loading, search with no matches, Clear filters, save/apply a named view and phone filter panel. |
| A07 | Passed: promoted the unlinked demonstration account to Admin, confirmed the change, and verified a new sign-in returned the Admin role. |

Corrections from the walkthrough: the wrong-current-password response clears
all three password inputs, and the property-link input is labelled **Add an
asset ID**. The instructions now match those behaviors.

## Remaining acceptance checks

- **H05–H07, A08–A09:** submissions (#38), issue status/history (#44), reviews
  (#39) and full-assessment requests (#45) are absent from the reviewed build.
  Capture and validate them once merged; the planned sections remain labelled.
- **Independent walkthrough:** a teammate who did not write the guides must
  follow the available procedures without help, recording their name, date,
  build, actual results and corrections in this section. PR review alone does
  not establish that the walkthrough happened.
- **Door tag:** confirm the Asset ID's printed position against a real tag;
  the guide currently tells readers to find its label without inventing a location.
- Less common errors listed from source, including last-admin protection,
  duplicate-email edits, expired-profile messaging and infrastructure outages,
  need dedicated live checks if they are included in the final acceptance run.

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
auth, assessment, profile and administrator error helpers. The walkthrough record
distinguishes executed checks from source-checked and pending cases.

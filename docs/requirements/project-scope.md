# Project scope and requirements

Updated November 19, 2026

## Purpose

The Fire Hazardous Vegetation Portal gives Scottsdale residents a simple way
to review hazardous-vegetation inspections for their properties, submit photos
after corrective work, and follow the City's review decision. It also gives
authorized City administrators the tools to review resident submissions,
monitor hazards, manage users, and receive requests for full home assessments.

The portal supports the resident follow-up and administrative review process.
It does not replace the City's field-inspection tools or create a new inspection
workflow for firefighters.

## Users and roles

The portal has two roles:

- **Resident:** creates an account, links properties by Asset ID, views
  inspections and crew photos, submits completion photos, and requests a full
  home assessment.
- **Admin:** reviews resident submissions, uses the hazard map, manages users,
  and edits supported portal messages.

Firefighters do not need portal accounts. This was confirmed during the
October 29 sponsor meeting; field crews continue using the City's existing
ArcGIS and Survey123 workflow.

Resident accounts use portal registration and sign-in. The planned production
login for administrators is the City's Microsoft single sign-on. Until that
integration is available, the repository's local administrator accounts are a
development and demonstration mechanism, not the final City authentication
solution.

## Functional requirements

### Accounts and properties

- **FR-01 — Resident registration:** A resident can create an account with a
  name, email address, and password.
- **FR-02 — Property linking:** After signing in, a resident can link one or
  more properties by entering their Asset IDs.
- **FR-03 — Administrator sign-in:** The production portal will authenticate
  administrators through the City's Microsoft single sign-on.

### Inspections and photos

- **FR-04 — Inspection details:** A resident can view the latest available
  inspection details for a property linked to their account.
- **FR-05 — Original crew photos:** A resident can view the original crew
  photos associated with that inspection.
- **FR-06 — Completion-photo submission:** A resident can upload between one
  and five completion photos for an eligible inspection issue. Each photo must
  be a JPEG or PNG and no larger than 5 MB.
- **FR-07 — Optional comment:** A resident can include an optional written
  comment with a completion-photo submission.
- **FR-08 — Edit pending evidence:** The resident who created the latest
  pending submission can edit its comment or replace its photos until an admin
  reviews it.

### Administrative review and management

- **FR-09 — Review inbox:** An admin can see pending resident submissions in a
  review inbox and compare the resident evidence with the original inspection
  details and crew photos.
- **FR-10 — Review decision:** An admin can approve a submission or send it
  back. Sending it back requires a reason that the resident can read.
- **FR-11 — Hazard map:** An admin can view a hazard map and narrow the results
  with the available search and filters.
- **FR-12 — User management:** An admin can use the Users page to find and
  manage portal accounts and their linked properties.
- **FR-13 — Portal settings:** An admin can use the Settings page to edit the
  message shown when a disabled account attempts to sign in.
- **FR-14 — Full home assessment request:** A resident can request a full home
  assessment for a linked property. The request records interest for City
  follow-up; it does not schedule an appointment.

## Non-functional requirements

- **NFR-01 — Role-based access:** Resident and admin capabilities must be
  separated. A resident must not gain access to admin pages or actions.
- **NFR-02 — Property access:** A resident can access inspection and submission
  data only for properties linked to their account. An admin can access the
  records required for administration and review.
- **NFR-03 — Image validation:** The server must validate the actual uploaded
  image content, its declared type, file size, and photo count. Renaming an
  invalid file to `.jpg` or `.png` must not bypass validation.
- **NFR-04 — Protected photo links:** Crew and resident photos must use
  authenticated, authorized links rather than public file URLs.
- **NFR-05 — Privacy:** Inspection data, comments, and photos must be limited to
  the linked resident and authorized admins. Photos must not be stored in Git or
  a public frontend directory.
- **NFR-06 — Usability:** Forms and review actions must provide clear labels,
  validation messages, loading states, and success or failure feedback.
- **NFR-07 — Photo limits:** A submission must contain 1–5 JPEG or PNG files,
  with a maximum size of 5 MB per file.

## Constraints and assumptions

- **CON-01 — NAOS data only:** The current portal uses the supplied NAOS
  inspection dataset. Other City inspection datasets are outside this scope.
- **CON-02 — No live City data integration yet:** Data may be imported or
  hard-coded for the current version. Continuous synchronization with City
  systems is not required.
- **CON-03 — Asset IDs are accepted as supplied:** The portal may confirm that
  an Asset ID exists in the imported data, but it assumes that a resident who
  provides the ID is allowed to link it. Ownership verification is not part of
  this version.
- **CON-04 — Existing field workflow remains:** Firefighters continue to record
  inspections and original photos through ArcGIS and Survey123.

## Out of scope

The following items are explicitly outside the portal scope:

- support for parent Asset IDs;
- an additional authentication or proof-of-ownership layer for linking an
  Asset ID to a resident account;
- AI-based decisions, image analysis, or OCR;
- the drone inspection or plant-moisture idea;
- firefighter accounts or firefighter-facing portal workflows;
- replacing ArcGIS, Survey123, or the City's field-inspection process;
- automatically clearing a hazard when a resident uploads photos;
- email or text notifications for submissions and review decisions; and
- scheduling a home-assessment appointment inside the portal.

## Traceability to Taiga

This table uses only story numbers supported by repository documentation or
public pull-request metadata. A task number is shown when the repository records
the implementation task but does not identify its parent user story. Items
marked **Not recorded** need their Taiga story number added after confirmation;
no number has been guessed.

| Requirement | Taiga user story | Related implementation task or evidence |
| --- | --- | --- |
| FR-01 — Resident registration | Not recorded | `feature/signup`, `feature/login`, and `feature/connect-frontend-backend` |
| FR-02 — Property linking | #42 | `feature/42-property-link` and `feature/link-properties-after-signup` |
| FR-03 — Microsoft admin sign-in | Not recorded; planned | Production integration is not implemented in the repository |
| FR-04 — Inspection details | Not recorded | Tasks #71 (assessment API) and #72 (property assessment page) |
| FR-05 — Original crew photos | Not recorded | Task #71 includes protected crew-photo access; task #72 displays the photos |
| FR-06 — Completion-photo submission | #38 and #43 | #43 defines the evidence requirements; #38 implements upload and editing |
| FR-07 — Optional comment | #43 | Photo-evidence acceptance criteria |
| FR-08 — Edit pending evidence | #38 | Homeowner photo upload and editing workflow |
| FR-09 — Review inbox | #39 | Administrator review workflow |
| FR-10 — Approve or send back | #39 | Administrator review decision and reason workflow |
| FR-11 — Admin hazard map and filters | Not recorded | `feature/admin-hazard-map` and `feature/hazard-map-triage` |
| FR-12 — Users page | Not recorded | `feature/admin-user-list`, `feature/admin-users-ui`, and `feature/admin-edit-deactivate-user` |
| FR-13 — Disabled-account message setting | Not recorded | `feature/editable-portal-messages` |
| FR-14 — Full home assessment request | #45 | Tasks #80 (API) and #81 (resident and admin pages) |
| NFR-01 and NFR-02 — Role and property access | #38, #39, and #43 where applicable | Two-role decision from the October 29 meeting; task #71 protects assessments and crew photos |
| NFR-03 and NFR-07 — Image validation and limits | #43 | #38 implements the validation rules |
| NFR-04 and NFR-05 — Protected links and privacy | #38, #41, and #43 | #41 records the private photo-storage decision |
| NFR-06 — Usability and feedback | Not recorded | Covered across the resident and admin feature implementations |
| CON-01 and CON-02 — NAOS/imported data | Not recorded | `feature/data` and `feature/33-assessment-tables` |
| CON-03 — Asset-ID assumption | #42 | Property-linking workflow; ownership proof remains out of scope |
| CON-04 — Existing firefighter workflow | #43 where photo evidence is concerned | October 29 two-role decision and `feature/two-roles-resident-admin` |

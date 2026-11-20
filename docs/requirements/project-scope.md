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

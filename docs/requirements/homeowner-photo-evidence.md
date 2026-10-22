# Homeowner photo evidence requirements

Taiga story: #43  
Status: Requirements defined from the October 14, 2026 sponsor discussion

## User story

As a homeowner, I want to attach photo evidence when I report that a hazardous
vegetation issue has been fixed so that an administrator can verify the work.

## Confirmed workflow

1. A homeowner opens an issue associated with their property.
2. The homeowner reports that the corrective work is complete.
3. The homeowner attaches at least one photo showing the completed work.
4. The submission is placed in a pending-review state.
5. An administrator compares the submitted evidence with the original issue.
6. The administrator approves the resolution or rejects it for additional work.

Uploading a photo does not automatically clear or close the issue. The issue is
only cleared after administrator review.

## Roles

- **Homeowner:** reports completed work and submits the supporting photo.
- **Administrator:** reviews the evidence and decides whether the issue can be
  cleared.
- **Field crew:** continues recording inspection information and crew photos in
  Survey123 and ArcGIS. Field crew photo collection is not part of this portal
  workflow.

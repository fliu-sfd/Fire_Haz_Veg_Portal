# Homeowner photo evidence requirements

Taiga story: #43  
Status: Sponsor workflow confirmed; technical MVP constraints selected by Team 4

## User story

As a homeowner, I want to attach photo evidence when I report that a hazardous
vegetation issue has been fixed so that an administrator can verify the work.

## Confirmed workflow

1. A homeowner views an existing inspection issue associated with their
   property.
2. The homeowner reports that the corrective work is complete.
3. The homeowner attaches at least one photo showing the completed work.
4. The submission is placed in a pending-review state.
5. An administrator compares the submitted evidence with the original issue.
6. The administrator clears the issue when the evidence is sufficient or leaves
   it unresolved when more work or evidence is needed.

Uploading a photo does not automatically clear or close the issue. The issue is
only cleared after administrator review.

## Roles

- **Homeowner:** reports completed work and submits the supporting photo.
- **Administrator:** reviews the evidence and decides whether the issue can be
  cleared.
- **Field crew:** continues recording inspection information and crew photos in
  Survey123 and ArcGIS. Field crew photo collection is not part of this portal
  workflow.

## Acceptance criteria

- A homeowner cannot submit an issue as fixed without attaching at least one
  photo.
- Each submitted photo is associated with the correct property and assessment.
- A successful submission changes the issue to pending administrator review,
  not directly to closed or cleared.
- An administrator can view the homeowner's evidence together with the original
  issue information.
- An administrator can approve the resolution or reject it for more work.
- A rejected submission remains unresolved and can receive new evidence.
- A homeowner cannot submit evidence for a property that is not linked to their
  account.
- A submission accepts JPEG or PNG images, with a maximum size of 5 MB per
  image and no more than five images.
- A written homeowner comment is optional.
- Pending submissions appear in the administrator review queue. Email or text
  notifications are not required for the first version.
- Photos are private and are only available to the linked homeowner and an
  authorized administrator.

## Acceptance scenarios

### Evidence is missing

Given a homeowner is reporting an issue as fixed, when no photo is attached,
then the submission is rejected and the issue remains unresolved.

### Evidence is submitted

Given a homeowner has access to the property, when at least one photo is
attached and the fixed report is submitted, then the issue becomes pending
review and remains visible to an administrator.

### Evidence is approved

Given an issue is pending review, when an administrator approves the evidence,
then the issue can be cleared.

### Evidence is rejected

Given an issue is pending review, when an administrator rejects the evidence,
then the issue remains unresolved and the homeowner can submit updated evidence.

## Out of scope for this story

- Building the upload endpoint or homeowner upload interface.
- Building the administrator review screen or notification system.
- Replacing the field crew's Survey123 or ArcGIS workflow.
- Selecting or deploying production photo storage.

## MVP decisions

The following are Team 4 implementation constraints for the first version. They
support the sponsor-confirmed workflow but were not individually specified by
the sponsor.

- Accept JPEG and PNG images only.
- Limit each image to 5 MB.
- Allow between one and five photos in one submission.
- Keep the homeowner comment optional because the photo is the required
  evidence.
- Place new submissions in an administrator review queue. Email and text
  notifications are outside the first version.
- Store photos privately. They must not be placed in Git, a public directory,
  or an unauthenticated URL.
- Permit access only to the homeowner linked to the property and authorized
  administrators.
- Keep a photo while its assessment and review record exist. Deleting an
  assessment also deletes its associated photo records and stored files.

The City may provide a longer legal or records-retention period before
deployment. That policy can extend the retention period, but it does not change
the MVP workflow defined in this specification.

## Requirement basis

During the October 14, 2026 sponsor discussion:

- The sponsor confirmed that field crews continue entering their inspection
  photos in the existing upstream system rather than this portal.
- The sponsor stated that a homeowner marking an issue as fixed needs to attach
  a photo showing the completed work.
- The sponsor described an administrator receiving an alert, comparing the
  homeowner photo with the original issue, and clearing the issue only after
  review.
- The sponsor emphasized that an unrelated upload must not automatically make
  an issue disappear.
- An email alert or administrative page was discussed as a possible mechanism,
  with the sponsor noting that it could be limited if it exceeded the project
  scope. This specification therefore requires an in-application review queue
  but leaves email and text notifications outside the first version.

The image formats, file-size limit, photo-count limit, optional comment, access
rules, and MVP retention behavior are Team 4 decisions documented above. They
can be revised if the sponsor or City IT supplies a conflicting policy.

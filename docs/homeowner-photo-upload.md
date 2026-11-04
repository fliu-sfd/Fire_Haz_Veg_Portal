# Homeowner photo uploads (#38)

Residents open **Connected properties → View assessment** and submit completion
photos under the relevant inspection point. The original crew finding and crew
photos remain visible. A successful upload saves a separate pending-review record,
shows confirmation, and adds it to submission history. Uploading does not clear a hazard.
The homeowner's submission step shows green **Submitted** while department verification
is pending. Administrators open **Review inbox**, compare the evidence, and save an
Approve/Send back decision with a comment. Homeowners see the department decision
and can submit new evidence after a Send back decision.

## Docker storage

Run the stack from the repository root:

```bash
docker compose up --build -d
```

The API applies migrations through `0010` automatically. The existing `photos` named
volume mounts at `/app/photo_storage`; homeowner bytes use
`homeowner/<assessment UUID>/<submission UUID>/<photo UUID>.jpg|png`. PostgreSQL stores
the assessment relationship, review status, comment, original filename, byte count,
MIME type, and generated storage key. Images are not stored in Git or the frontend's
public folder. Running the backend outside Docker uses `PHOTO_STORAGE_DIR`
(default `./photo_storage`, relative to the backend process working directory).

Container replacement preserves the database and photo volumes. `docker compose down`
preserves them too; **`docker compose down -v` deletes both volumes**. Back up the
database and photo volume together. A volume is persistent storage, not a backup.

## Demo and photo links

1. Open `http://localhost:3000`, sign in as a resident, and link an Asset ID from the
   imported inspection data.
2. Select **View assessment**, find the inspection point with an issue, and choose
   1–5 JPEG or PNG photos (at most 5 MiB and 25 megapixels each).
3. Add an optional comment, select **Submit for review**, and wait for
   green **Submitted** and **Your action is complete — photos submitted**.
4. In **Submission history**, select **View photo** to preview it or open the
   thumbnail in a new tab. **Copy photo link** copies a stable URL like
   `http://localhost:8000/api/v1/submission-photos/<photo UUID>`.
5. Another signed-in, linked resident or administrator can open the same link.
   Logged-out viewers receive 401; unrelated residents receive 404. Unlinking the
   property or disabling the viewer revokes access on their next request.

To modify pending evidence, select **Edit submission** under **This is your submission**.
Change the comment and optionally select replacement photos, then **Save changes**.
Without replacement files the existing photo set stays; replacements overwrite the set
only after validation and a successful database save. Editing keeps the submission ID
and creation time, sets `updated_at`, and preserves `pending_review`. Only the submitting
resident can edit, while linked to a current-season issue. Reviewed evidence is read-only.
Replacing photos creates new photo URLs; links to replaced photos stop working.

For the department: **Hazard map → Pending review (or search Asset ID) → select
property → View assessment & submissions**. The admin page at
`/dashboard/hazards/<asset ID>` shows the original finding, crew photos, and saved
homeowner evidence together. Pending map counts now reflect the latest evidence for
each issue. No department approval is implied by green homeowner submission confirmation.

## Department review and notifications

**Review inbox** (`/dashboard/reviews`) lists the homeowner name, property, submitted
time, updated time, photo count, and **Review submission** link. The inbox and sidebar
pending-count badge refresh every 30 seconds, with a manual Refresh button on the page.
It is a shared work queue: viewing an item does not mark it read, and saving a decision
removes it from the pending list. No email, SMS, or browser notification permission is needed.

At the assessment, **Review submission** jumps to evidence. In **Review this submission**,
choose **Approve** or **Send back**, write a **Department comment**, and **Save decision**.
A Send back decision requires an explanation; an approval comment is optional. The
homeowner sees the decision and comment in history after refreshing their assessment.
All original inspection results and reviewed submissions are retained.

The API stores reviewer ID, time, comment, and an evidence version. Owner edits increment
that version. A decision requires the exact version the admin viewed; stale edits, repeat
decisions, superseded records, and unauthorized requests are refused. Only latest pending
evidence is actionable. New pending duplicates and uploads after approval are refused;
rejected evidence can be followed by a new submission. The map reports Pending review
if any issue is pending, Closed only if all issues have approved latest evidence, and
Open otherwise, including unapproved points without coordinates on a mapped property.

The image link identifies a database record; it never exposes the Docker filesystem
or embeds a password/token. Authorization happens before reading the file. Photo
responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.

`localhost` links work only on the computer running Docker. An internet showcase needs
a reachable host/domain, HTTPS, secure auth configuration, a browser API URL for that
host, and the matching CORS origin. Docker storage alone does not publish the site or
make a public share link. Keep homeowner evidence authenticated when hosting a demo.

## Limits and errors

The API decodes actual image data and checks the declared MIME type, image dimensions,
file size, file count, latest season, and property link. Empty, corrupt, disguised,
unsupported, and oversized uploads are rejected. Files are validated before permanent
storage, and failures clean up partial writes. Oversized files return 413; unsupported
types return 415; invalid image/comment data returns 422. More than five files are
refused by the bounded multipart parser. Use the existing latest-season assessment
API rather than maintaining a second property assessment endpoint.

Photo metadata cascades when an assessment is deleted. No assessment-deletion endpoint
exists; manual database removal must be paired with removal of that assessment's
homeowner folder from the volume. Property unlinking keeps the review records and files.

## Integration verification — November 4, 2026

Rebuilt on `dev` commit `0c60d24` to use the merged two-role model, property-management
controls, assessment page, photo-store dependency, and settings migration. Migration
`0008` follows `0007` rather than colliding with the merged `0006` role migration.

- Backend: 625 tests passed; four real-geodatabase tests skipped without `NAOS_GDB_PATH`.
  Ruff passed. Migration `0010` upgrade, downgrade to `0009`, re-upgrade, and schema check passed
  in a separate empty migration-test database.
- Frontend: 476 tests passed; type checking, ESLint, and production build passed.
- Docker: a synthetic image uploaded through the running API, was stored in the
  named photo volume, and remained readable at the same protected URL after API
  container recreation. An unauthenticated request returned 401.
- Safari: verified green Submitted confirmation, own-submission labels, editing a
  comment on the same record while retaining the photo, and viewing the updated
  evidence through the new admin map link. The map showed Pending review: 1 for
  the edit-test asset. Admin view displayed crew findings and homeowner evidence,
  with no homeowner edit controls. Previously verified photo preview/copy links and
  layout checks at 320, 375, 768, and 1280 CSS pixels. The user separately validated
  the browser file picker and submission, supplying screenshots of the saved evidence.

Only synthetic account, assessment, and image data were used for the isolated Docker
showcase. No City sample photos were published.

Review workflow tests also cover required Send back reasons, owner-visible comments,
resubmission after rejection, duplicate-pending protection, stale evidence versions,
repeated decisions, admin-only inbox access, and map closure across all issue points
(including points without coordinates). Live Docker tests verified Send back, homeowner
comment visibility, resubmission, and rejection of a stale approval attempt. The browser
Review inbox displayed homeowner/property notifications and its pending-count badge.
It also displayed the review radios, Department comment field, and Save decision button.
Safari capture/input interruptions prevented a reliable final browser Save test; approval
was completed through the live API on the separate `REVIEW-38` synthetic fixture. The
owner then received the approved status and comment, the inbox count decreased from four
to three, the item left the queue, the map became Closed, and repeated approval returned
409. The user's `E2E-38` evidence was not reviewed or changed by this check.

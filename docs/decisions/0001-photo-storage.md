# 0001: Photo storage decision

Date: 2026-10-15  
Story: Taiga #41 (N7 in the Sprint 4 Build Guide)  
Status: Proposed; teammate review and sponsor confirmation pending

## Context

The NAOS import (#33) and future homeowner uploads (#38) need a shared way to
save and retrieve photos. The Sprint 4 Build Guide reports 136 crew photos,
about 79.5 MB total, ranging from 236 KB to 974 KB. These are sample counts,
not a forecast of future storage needs. Photos can show private yards and homes.

The October 14 sponsor update keeps crew photography in ArcGIS and requires
homeowner photos when an issue is marked fixed, followed by administrator review.
This decision covers imported crew photos and future homeowner uploads. Upload,
review, notification, and photo-serving endpoints belong to later stories.
Hosting, permission to store/display City photos, and retention remain unresolved.

## Options

The effort and handoff assessments below are team judgments based on the current
code. City IT compatibility is unconfirmed for every option. No performance
benchmark or provider cost estimate has been made.

| Criterion | Local disk / Docker volume | PostgreSQL `bytea` | S3-compatible object storage |
| --- | --- | --- | --- |
| Cost | Uses host disk and separate backup capacity; no object-storage account. Host storage still has a cost. | Uses database disk and backup capacity for photo bytes as well as metadata. | Provider charges depend on storage, requests, transfer, and region [4]. A local service also needs hosting and maintenance. |
| Team effort | Lowest here: the store, configuration, and volume already exist. | Requires a binary column, migration, and database-backed store. | Requires another store implementation, endpoint configuration, credentials, and access policies. |
| Backups | Back up photos separately from PostgreSQL and restore them as a matching set. Volume persistence is not a backup [1]. | A complete database dump includes photo columns with other table data [2][3]. More stored bytes increase backup volume; timing needs measurement. | Define recovery, retention, and database coordination for the chosen provider. S3 versioning can recover older object versions when enabled; it is not a complete backup plan [5]. |
| Who can reach files | API process and authorized host/container operators. Keep the directory outside public web roots. Application authorization is still required. | Database credentials govern direct access; API authorization governs portal access. | Keep objects private. S3 offers Block Public Access [6]; presigned links grant temporary bearer access and must follow authorization [7]. Verify equivalent controls for another provider. |
| City IT fit | Needs approval of the host, filesystem access, backups, and retention. No external bucket is required. | Needs approval of database capacity, access, and backup arrangements. | Needs approval of the provider or hosted service, account ownership, credentials, location, and retention. |
| Next-team handoff | Existing Compose setup; document the photo volume, configuration, and restore process. Assumes one host with persistent disk. | Existing PostgreSQL tools, but photos become part of database growth and restores. | Extra service/account setup and recovery procedures; photos can remain independent of an API host rebuild. |

## Proposed decision and implementation

Use **local disk now through `PhotoStore`**, with the existing Docker named volume
`photos` mounted at `/app/photo_storage`. `PHOTO_STORAGE_DIR` configures the root;
when running the backend directly, its default is `./photo_storage` relative to
the working directory. This keeps development independent of a cloud account and
reuses the implementation already merged for #33. Production use still requires
the City's hosting and data-handling approval.

- Keep `save(key, data, content_type) -> str`, `read(key) -> bytes`, and
  `delete(key)` in `backend/app/storage/base.py` as the storage contract.
- Store metadata and an opaque relative `storage_key` in PostgreSQL. Imported
  keys use `crew/<assessment UUID>/<photo UUID>.<extension>`. Future homeowner
  keys must also use generated identifiers, not names or original filenames.
- Keep photos out of Git and public/static directories. The store checks paths
  against its root; it does not authenticate callers. Future #38/#39 API routes
  must check the session and access to the specific assessment before reading
  or returning a photo. Those routes do not exist yet.
- Propose JPEG/PNG and a 5 MB maximum for future homeowner uploads. These are
  team proposals for sponsor confirmation, not existing validation or a reason
  to reject historical import attachments.

The existing tests in `backend/tests/test_local_store.py` cover byte-for-byte
save/read, replacement, missing files, deletion, and rejection of absolute and
escaping paths. Reuse them rather than duplicate them under another filename.
They use synthetic bytes and do not establish image-upload validation.

Validation on October 15, 2026: **16 passed** using pytest 8.4.2 in a temporary
environment, with `PYTHONPATH=backend` and
`pytest --noconftest backend/tests/test_local_store.py -q`. This isolates storage
tests from the shared application/database fixtures; the full backend suite was
not run for this documentation change.

## Consequences and conditions for changing the decision

A named volume survives container replacement, but not loss of its host or
deliberate volume deletion [1]. `docker compose down -v` deletes the local named
volumes, including photos. Before deployment, assign a backup owner and agree
frequency, retention, and recovery targets with City IT. Back up PostgreSQL and
photos together while writes are paused, keep the backup outside the host, and
test restoring both and reading a linked photo. These procedures are proposed;
they are not automated by this story.

Revisit storage if hosting has no persistent disk, API instances run on several
hosts, City IT requires an approved object service, or measured capacity and
recovery needs exceed the single-host arrangement. An S3-compatible store can
implement the same interface. A switch also needs configuration, file transfer
with key preservation and byte verification, access-policy setup, and recovery
testing; adding a class alone does not migrate existing photos.

## Review and sponsor follow-up

Teammate reviewer/date: pending. Sponsor response/meeting-minutes reference:
pending. After teammate review, send this proposed three-line summary:

> We propose storing imported crew photos and future homeowner evidence photos.
> Files would live in a private server folder backed by a Docker volume, with metadata in PostgreSQL.
> Portal viewing would require sign-in and permission to access the assessment, enforced by the planned API routes.

Ask the unresolved sponsor questions: **(7)** May we store and display these
photos, and under what privacy, retention, and repository/data-sharing rules?
**(8)** Where will the portal be hosted, and what storage and backup arrangements
does City IT approve? Record the answers in the next meeting minutes and update
this record. If the chosen approach changes from local disk, coordinate the #33
and #38 tasks. This document does not claim review, delivery, or approval.

## References

Project basis: *Team 4 – Sprint 4 Build Guide*, N7, task 33.5, and the October 14
sponsor update. External references checked October 15, 2026:

1. [Docker volumes: persistence and backup/restore](https://docs.docker.com/engine/storage/volumes/).
2. [PostgreSQL 16 binary data (`bytea`)](https://www.postgresql.org/docs/16/datatype-binary.html).
3. [PostgreSQL 16 SQL dumps](https://www.postgresql.org/docs/16/backup-dump.html).
4. [Amazon S3 pricing categories](https://aws.amazon.com/s3/pricing/).
5. [Amazon S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).
6. [Amazon S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html).
7. [Amazon S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

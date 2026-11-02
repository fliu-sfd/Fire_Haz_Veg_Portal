import uuid
from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import event, func, select

from app.api.deps import get_photo_store
from app.api.routes.submissions import MAX_UPLOAD_BYTES
from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.models import Assessment, ResidentAsset, Submission, SubmissionPhoto, User, UserRole
from app.services.submission_service import MAX_PHOTO_BYTES
from app.storage import LocalDiskStore

pytestmark = pytest.mark.db
BASE = "/api/v1"


def image_bytes(kind="PNG"):
    output = BytesIO()
    Image.new("RGB", (10, 10), "green").save(output, kind)
    return output.getvalue()


def login(client, user):
    client.cookies.clear()
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


@pytest.fixture
def evidence(client, db, tmp_path):
    def assessment(asset="1001", year=2026, status="ISSUES", comment="Trim this vegetation"):
        row = Assessment(
            season_year=year,
            source_global_id=uuid.uuid4(),
            asset_id=asset,
            status=status,
            comments=comment,
        )
        db.add(row)
        db.flush()
        return row

    def user(name, role=UserRole.RESIDENT, assets=()):
        row = User(
            email=f"{name}@example.com",
            password_hash="not-a-real-hash",
            full_name=name,
            role=role,
            resident_assets=[ResidentAsset(asset_id=a) for a in assets],
        )
        db.add(row)
        db.flush()
        return row

    rows = {
        "issue": assessment(),
        "second": assessment(comment="Clear this other point"),
        "old": assessment(year=2025),
        "clear": assessment(status="NO ISSUES"),
        "unrelated": assessment(asset="2002"),
        "owner": user("owner", assets=["1001"]),
        "other": user("other", assets=["2002"]),
        "admin": user("admin", UserRole.ADMIN),
    }
    db.commit()
    store = LocalDiskStore(tmp_path / "private-photos")
    app.dependency_overrides[get_photo_store] = lambda: store
    login(client, rows["owner"])
    yield rows | {"store": store}
    app.dependency_overrides.pop(get_photo_store, None)


def submit(client, evidence, files=None, **kwargs):
    if files is None:
        files = [("photos", ("evidence.png", image_bytes(), "image/png"))]
    return client.post(
        f"{BASE}/assessments/{evidence['issue'].id}/submissions", files=files, **kwargs
    )


def assert_nothing_saved(db, evidence):
    assert db.scalar(select(func.count()).select_from(Submission)) == 0
    assert db.scalar(select(func.count()).select_from(SubmissionPhoto)) == 0
    assert not [p for p in evidence["store"].root.rglob("*") if p.is_file()]


@pytest.mark.parametrize("kind,mime", [("PNG", "image/png"), ("JPEG", "image/jpeg")])
def test_valid_upload_is_private_linked_pending_and_does_not_clear_issue(
    client, db, evidence, kind, mime
):
    data = image_bytes(kind)
    response = submit(
        client,
        evidence,
        [("photos", ("../../yard.jpg", data, mime))],
        data={"comment": "  Trimmed the tree  "},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["assessment_id"] == str(evidence["issue"].id)
    assert body["status"] == "pending_review"
    assert body["comment"] == "Trimmed the tree"
    assert "storage_key" not in str(body)
    row = db.get(Submission, uuid.UUID(body["id"]))
    assert row.homeowner_id == evidence["owner"].id
    photo = db.get(SubmissionPhoto, uuid.UUID(body["photos"][0]["id"]))
    assert photo.file_name == "yard.jpg"
    assert photo.content_type == mime
    assert photo.size_bytes == len(data)
    assert photo.storage_key.startswith(f"homeowner/{evidence['issue'].id}/{row.id}/")
    assert "yard" not in photo.storage_key
    assert evidence["store"].read(photo.storage_key) == data
    db.refresh(evidence["issue"])
    assert evidence["issue"].status == "ISSUES"
    history = client.get(f"{BASE}/assessments/{row.assessment_id}/submissions")
    assert history.status_code == 200
    assert history.json() == [body]


def test_five_photos_and_optional_comment(client, evidence):
    response = submit(
        client, evidence, [("photos", (f"{i}.png", image_bytes(), "image/png")) for i in range(5)]
    )
    assert response.status_code == 201, response.text
    assert len(response.json()["photos"]) == 5
    assert response.json()["comment"] is None


@pytest.mark.parametrize(
    "data,mime,status",
    [
        (b"text pretending to be a photo", "image/jpeg", 422),
        (b"<svg></svg>", "image/svg+xml", 415),
        (image_bytes(), "image/jpeg", 415),
        (b"", "image/png", 422),
        (b"x" * (MAX_PHOTO_BYTES + 1), "image/png", 413),
    ],
)
def test_invalid_uploads_leave_no_records_or_files(client, db, evidence, data, mime, status):
    response = submit(client, evidence, [("photos", ("bad.jpg", data, mime))])
    assert response.status_code == status, response.text
    assert_nothing_saved(db, evidence)


def test_invalid_second_photo_does_not_save_the_first(client, db, evidence):
    response = submit(
        client,
        evidence,
        [
            ("photos", ("good.png", image_bytes(), "image/png")),
            ("photos", ("bad.png", b"invalid", "image/png")),
        ],
    )
    assert response.status_code == 422
    assert_nothing_saved(db, evidence)


def test_missing_photo_is_rejected(client, db, evidence):
    response = submit(client, evidence, [("comment", (None, "Finished the work"))])
    assert response.status_code == 422
    assert_nothing_saved(db, evidence)


def test_six_photos_are_rejected_by_multipart_parser(client, db, evidence):
    response = submit(
        client, evidence, [("photos", (f"{i}.png", image_bytes(), "image/png")) for i in range(6)]
    )
    assert response.status_code == 400
    assert_nothing_saved(db, evidence)


def test_long_comment_is_rejected(client, db, evidence):
    assert submit(client, evidence, data={"comment": "x" * 2001}).status_code == 422
    assert_nothing_saved(db, evidence)


def test_declared_total_size_limit(client, db, evidence):
    response = submit(client, evidence, headers={"Content-Length": str(MAX_UPLOAD_BYTES + 1)})
    assert response.status_code == 413
    assert_nothing_saved(db, evidence)


def test_streamed_body_without_length_is_bounded(client, db, evidence):
    boundary = "test-boundary"

    def chunks():
        yield (
            f'--{boundary}\r\nContent-Disposition: form-data; name="photos"; '
            'filename="large.png"\r\nContent-Type: image/png\r\n\r\n'
        ).encode()
        for _ in range(27):
            yield b"x" * (1024 * 1024)
        yield f"\r\n--{boundary}--\r\n".encode()

    response = client.post(
        f"{BASE}/assessments/{evidence['issue'].id}/submissions",
        content=chunks(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    assert response.status_code == 413, response.text
    assert_nothing_saved(db, evidence)


@pytest.mark.parametrize("who,status", [("other", 404), ("admin", 403)])
def test_only_linked_homeowner_can_upload(client, db, evidence, who, status):
    login(client, evidence[who])
    assert submit(client, evidence).status_code == status
    assert_nothing_saved(db, evidence)


def test_logged_out_upload_is_rejected(client, db, evidence):
    client.cookies.clear()
    assert submit(client, evidence).status_code == 401
    assert_nothing_saved(db, evidence)


@pytest.mark.parametrize("assessment", ["old", "clear"])
def test_uploads_require_current_season_issue(client, db, evidence, assessment):
    response = submit(client, evidence | {"issue": evidence[assessment]})
    assert response.status_code == 409
    assert_nothing_saved(db, evidence)


def test_missing_assessment(client, db, evidence):
    response = client.post(
        f"{BASE}/assessments/{uuid.uuid4()}/submissions",
        files=[
            ("photos", ("photo.png", image_bytes(), "image/png")),
        ],
    )
    assert response.status_code == 404
    assert_nothing_saved(db, evidence)


def test_existing_property_assessment_links_to_isolated_submission_history(client, evidence):
    saved = submit(client, evidence).json()
    response = client.get(f"{BASE}/assessments/1001")
    assert response.status_code == 200
    rows = {r["id"]: r for r in response.json()["inspections"]}
    assert set(rows) == {str(evidence[k].id) for k in ("issue", "second", "clear")}
    for point in ("issue", "second", "clear"):
        history = client.get(f"{BASE}/assessments/{evidence[point].id}/submissions")
        assert history.status_code == 200
        assert history.json() == ([saved] if point == "issue" else [])
    assert client.get(f"{BASE}/assessments/2002").status_code == 404


@pytest.mark.parametrize("who,status", [("owner", 200), ("admin", 200), ("other", 404)])
def test_private_photo_and_history_permissions(client, evidence, who, status):
    saved = submit(client, evidence).json()
    login(client, evidence[who])
    response = client.get(f"{BASE}/submission-photos/{saved['photos'][0]['id']}")
    assert response.status_code == status
    if status == 200:
        assert response.content == image_bytes()
        assert response.headers["content-type"] == "image/png"
        assert response.headers["cache-control"] == "private, no-store"
        assert response.headers["x-content-type-options"] == "nosniff"
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions")
    assert history.status_code == status


def test_unlinking_property_revokes_photo_access(client, db, evidence):
    saved = submit(client, evidence).json()
    evidence["owner"].resident_assets.clear()
    db.commit()
    assert client.get(f"{BASE}/submission-photos/{saved['photos'][0]['id']}").status_code == 404


def test_photo_link_requires_a_session(client, evidence):
    saved = submit(client, evidence).json()
    client.cookies.clear()
    assert client.get(f"{BASE}/submission-photos/{saved['photos'][0]['id']}").status_code == 401


def test_photo_link_reads_persisted_file_from_a_new_store_instance(client, evidence):
    saved = submit(client, evidence).json()
    app.dependency_overrides[get_photo_store] = lambda: LocalDiskStore(evidence["store"].root)
    response = client.get(f"{BASE}/submission-photos/{saved['photos'][0]['id']}")
    assert response.status_code == 200
    assert response.content == image_bytes()


def test_unlinked_homeowner_cannot_submit_using_a_previous_assessment_link(client, db, evidence):
    evidence["owner"].resident_assets.clear()
    db.commit()
    assert submit(client, evidence).status_code == 404
    assert_nothing_saved(db, evidence)


def test_missing_photo_file_returns_404(client, db, evidence):
    saved = submit(client, evidence).json()
    photo = db.get(SubmissionPhoto, uuid.UUID(saved["photos"][0]["id"]))
    evidence["store"].delete(photo.storage_key)
    assert client.get(f"{BASE}/submission-photos/{photo.id}").status_code == 404


def test_storage_failure_cleans_up_all_files(client, db, evidence, monkeypatch):
    save = evidence["store"].save
    calls = 0

    def fail_second(*args):
        nonlocal calls
        calls += 1
        save(*args)
        if calls == 2:
            raise OSError("storage unavailable")

    monkeypatch.setattr(evidence["store"], "save", fail_second)
    with pytest.raises(OSError, match="storage unavailable"):
        submit(
            client,
            evidence,
            [("photos", (f"{i}.png", image_bytes(), "image/png")) for i in range(2)],
        )
    assert_nothing_saved(db, evidence)


def test_database_failure_cleans_up_saved_photos(client, db, evidence):
    def fail(*args):
        raise RuntimeError("database write failed")

    event.listen(Submission, "before_insert", fail)
    try:
        with pytest.raises(RuntimeError, match="database write failed"):
            submit(client, evidence)
    finally:
        event.remove(Submission, "before_insert", fail)
    assert_nothing_saved(db, evidence)


def test_removing_assessment_cascades_submission_metadata(db, client, evidence):
    submit(client, evidence)
    db.delete(evidence["issue"])
    db.flush()
    assert db.scalar(select(func.count()).select_from(Submission)) == 0
    assert db.scalar(select(func.count()).select_from(SubmissionPhoto)) == 0


def edit(client, evidence, saved, *, comment="Updated cleanup details", photos=()):
    return client.patch(
        f"{BASE}/assessments/{evidence['issue'].id}/submissions/{saved['id']}",
        files=[("comment", (None, comment)), *photos],
    )


def test_owner_edits_pending_comment_without_creating_another_submission(client, db, evidence):
    saved = submit(client, evidence).json()
    response = edit(client, evidence, saved)
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["id"] == saved["id"]
    assert updated["created_at"] == saved["created_at"]
    assert updated["updated_at"] is not None
    assert updated["comment"] == "Updated cleanup details"
    assert updated["photos"] == saved["photos"]
    assert updated["status"] == "pending_review"
    assert updated["is_own_submission"] and updated["can_edit"]
    assert db.scalar(select(func.count()).select_from(Submission)) == 1
    points = client.get(f"{BASE}/assessments/1001").json()["inspections"]
    point = next(item for item in points if item["id"] == str(evidence["issue"].id))
    assert point["submission_status"] == "pending_review"
    assert point["status"] == "ISSUES"


def test_owner_replaces_photos_and_old_file_is_removed_after_save(client, db, evidence):
    saved = submit(client, evidence).json()
    old_id = uuid.UUID(saved["photos"][0]["id"])
    old_key = db.get(SubmissionPhoto, old_id).storage_key
    data = image_bytes("JPEG")
    response = edit(client, evidence, saved, photos=[("photos", ("new.jpg", data, "image/jpeg"))])
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["id"] == saved["id"]
    assert updated["photos"][0]["id"] != str(old_id)
    assert client.get(f"{BASE}/submission-photos/{updated['photos'][0]['id']}").content == data
    assert client.get(f"{BASE}/submission-photos/{old_id}").status_code == 404
    assert not (evidence["store"].root / old_key).exists()
    assert db.scalar(select(func.count()).select_from(SubmissionPhoto)) == 1


@pytest.mark.parametrize("status", ["approved", "rejected"])
def test_reviewed_submissions_cannot_be_edited(client, db, evidence, status):
    saved = submit(client, evidence).json()
    row = db.get(Submission, uuid.UUID(saved["id"]))
    row.status = status
    db.commit()
    assert edit(client, evidence, saved).status_code == 409
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history[0]["can_edit"] is False


def test_other_linked_owner_can_view_but_cannot_edit_someone_elses_evidence(client, db, evidence):
    saved = submit(client, evidence).json()
    db.add(ResidentAsset(user_id=evidence["other"].id, asset_id="1001"))
    db.commit()
    login(client, evidence["other"])
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history[0]["is_own_submission"] is False
    assert history[0]["can_edit"] is False
    assert edit(client, evidence, saved).status_code == 404


def test_admin_can_view_evidence_but_cannot_edit_homeowner_submission(client, evidence):
    saved = submit(client, evidence).json()
    login(client, evidence["admin"])
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history[0]["can_edit"] is False
    assert edit(client, evidence, saved).status_code == 403


def test_promoted_former_homeowner_cannot_edit_as_admin(client, db, evidence):
    saved = submit(client, evidence).json()
    evidence["owner"].role = UserRole.ADMIN
    db.commit()
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history[0]["is_own_submission"] is True
    assert history[0]["can_edit"] is False
    assert edit(client, evidence, saved).status_code == 403


def test_unlink_and_logout_revoke_edit_access(client, db, evidence):
    saved = submit(client, evidence).json()
    evidence["owner"].resident_assets.clear()
    db.commit()
    assert edit(client, evidence, saved).status_code == 404
    client.cookies.clear()
    assert edit(client, evidence, saved).status_code == 401


def test_bad_replacement_preserves_original_evidence(client, db, evidence):
    saved = submit(client, evidence).json()
    response = edit(client, evidence, saved, photos=[("photos", ("bad.png", b"bad", "image/png"))])
    assert response.status_code == 422
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history == [saved]
    assert (
        client.get(f"{BASE}/submission-photos/{saved['photos'][0]['id']}").content == image_bytes()
    )


def test_failed_edit_storage_preserves_old_files_and_removes_new_files(
    client, db, evidence, monkeypatch
):
    saved = submit(client, evidence).json()
    original_save = evidence["store"].save

    def fail(*args):
        original_save(*args)
        raise OSError("replacement failed")

    monkeypatch.setattr(evidence["store"], "save", fail)
    with pytest.raises(OSError, match="replacement failed"):
        edit(client, evidence, saved, photos=[("photos", ("new.png", image_bytes(), "image/png"))])
    assert client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json() == [saved]
    assert len([p for p in evidence["store"].root.rglob("*") if p.is_file()]) == 1


def test_failed_edit_database_preserves_original_evidence(client, db, evidence):
    saved = submit(client, evidence).json()

    def fail(*args):
        raise RuntimeError("edit database failed")

    event.listen(Submission, "before_update", fail)
    try:
        with pytest.raises(RuntimeError, match="edit database failed"):
            edit(
                client,
                evidence,
                saved,
                photos=[("photos", ("new.png", image_bytes(), "image/png"))],
            )
    finally:
        event.remove(Submission, "before_update", fail)
    assert client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json() == [saved]
    assert len([p for p in evidence["store"].root.rglob("*") if p.is_file()]) == 1


def review(client, saved, decision="approved", comment="Work verified", version=None):
    return client.post(
        f"{BASE}/admin/submissions/{saved['id']}/review",
        json={
            "decision": decision,
            "comment": comment,
            "expected_version": saved["version"] if version is None else version,
        },
    )


def test_review_inbox_notifies_admin_of_owner_property_and_photo_count(client, evidence):
    saved = submit(client, evidence).json()
    login(client, evidence["admin"])
    body = client.get(f"{BASE}/admin/submissions").json()
    assert body["total"] == 1
    assert body["items"][0]["submission_id"] == saved["id"]
    assert body["items"][0]["homeowner_name"] == "owner"
    assert body["items"][0]["asset_id"] == "1001"
    assert body["items"][0]["photo_count"] == 1
    assert "storage_key" not in str(body)
    assert client.get(f"{BASE}/admin/submissions/count").json() == {"pending": 1}


@pytest.mark.parametrize("who,status", [("owner", 403), ("other", 403)])
def test_only_admin_can_list_and_review_submissions(client, evidence, who, status):
    saved = submit(client, evidence).json()
    login(client, evidence[who])
    assert client.get(f"{BASE}/admin/submissions").status_code == status
    assert client.get(f"{BASE}/admin/submissions/count").status_code == status
    assert review(client, saved).status_code == status


def test_review_inbox_and_decision_require_login(client, evidence):
    saved = submit(client, evidence).json()
    client.cookies.clear()
    assert client.get(f"{BASE}/admin/submissions").status_code == 401
    assert review(client, saved).status_code == 401


def test_admin_approves_and_owner_sees_immutable_decision_and_comment(client, db, evidence):
    saved = submit(client, evidence).json()
    login(client, evidence["admin"])
    response = review(client, saved, comment="  Cleanup verified. Thank you.  ")
    assert response.status_code == 200, response.text
    approved = response.json()
    assert approved["status"] == "approved"
    assert approved["review_comment"] == "Cleanup verified. Thank you."
    assert approved["reviewed_at"] and approved["version"] == saved["version"] + 1
    assert not approved["can_review"] and not approved["can_edit"]
    row = db.get(Submission, uuid.UUID(saved["id"]))
    assert row.reviewed_by == evidence["admin"].id
    assert client.get(f"{BASE}/admin/submissions/count").json() == {"pending": 0}
    assert client.get(f"{BASE}/admin/submissions").json()["items"] == []
    assert review(client, saved).status_code == 409
    login(client, evidence["owner"])
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert history[0]["review_comment"] == "Cleanup verified. Thank you."
    assert edit(client, evidence, saved).status_code == 409
    assert submit(client, evidence).status_code == 409
    db.refresh(evidence["issue"])
    assert evidence["issue"].status == "ISSUES"


@pytest.mark.parametrize("comment", [None, "", "   ", "x" * 2001])
def test_sending_back_requires_valid_explanatory_comment(client, evidence, comment):
    saved = submit(client, evidence).json()
    login(client, evidence["admin"])
    assert review(client, saved, decision="rejected", comment=comment).status_code == 422
    assert client.get(f"{BASE}/admin/submissions/count").json() == {"pending": 1}


def test_send_back_then_homeowner_resubmits_and_admin_can_review_again(client, evidence):
    saved = submit(client, evidence).json()
    login(client, evidence["admin"])
    rejected = review(
        client, saved, "rejected", "Please clear the remaining brush and send a wider photo."
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    login(client, evidence["owner"])
    new = submit(client, evidence).json()
    assert new["id"] != saved["id"] and new["status"] == "pending_review"
    history = client.get(f"{BASE}/assessments/{evidence['issue'].id}/submissions").json()
    assert [item["status"] for item in history] == ["pending_review", "rejected"]
    assert history[1]["review_comment"].startswith("Please clear")
    login(client, evidence["admin"])
    assert client.get(f"{BASE}/admin/submissions").json()["items"][0]["submission_id"] == new["id"]
    assert review(client, new).status_code == 200


def test_admin_cannot_review_an_old_version_after_homeowner_edits(client, evidence):
    saved = submit(client, evidence).json()
    edited = edit(client, evidence, saved).json()
    assert edited["version"] == saved["version"] + 1
    login(client, evidence["admin"])
    assert review(client, saved).status_code == 409
    assert review(client, edited).status_code == 200


def test_duplicate_pending_upload_is_refused_in_favor_of_editing(client, evidence):
    submit(client, evidence)
    assert submit(client, evidence).status_code == 409


def test_inbox_excludes_older_seasons_and_no_issue_findings(client, db, evidence):
    for key in ("old", "clear"):
        db.add(Submission(assessment_id=evidence[key].id, status="pending_review"))
    db.commit()
    login(client, evidence["admin"])
    assert client.get(f"{BASE}/admin/submissions/count").json() == {"pending": 0}


def test_inbox_pagination_is_bounded(client, evidence):
    submit(client, evidence)
    login(client, evidence["admin"])
    assert client.get(f"{BASE}/admin/submissions?limit=0").status_code == 422
    assert client.get(f"{BASE}/admin/submissions?offset=-1").status_code == 422
    body = client.get(f"{BASE}/admin/submissions?limit=1&offset=1").json()
    assert body["total"] == 1 and body["items"] == []

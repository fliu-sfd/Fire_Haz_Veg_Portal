import uuid

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.models import Assessment, AssessmentStatusChange, ReviewStatus, User
from tests.test_user_models import make_user

pytestmark = pytest.mark.db


def add_point(db, status="ISSUES", **extra):
    row = Assessment(
        season_year=2026,
        source_global_id=uuid.uuid4(),
        asset_id="B-2001",
        status=status,
        **extra,
    )
    db.add(row)
    db.flush()
    return row


def add_change(db, point, to=ReviewStatus.PENDING_REVIEW, frm=ReviewStatus.OPEN, **extra):
    entry = AssessmentStatusChange(assessment_id=point.id, from_status=frm, to_status=to, **extra)
    db.add(entry)
    db.flush()
    return entry


def test_review_status_is_empty_until_it_is_set(db):
    point = add_point(db, status="NO ISSUES")
    db.refresh(point)
    print("review_status:", point.review_status)
    assert point.review_status is None


@pytest.mark.parametrize("state", list(ReviewStatus))
def test_each_review_status_round_trips(db, state):
    point = add_point(db, review_status=state)
    db.expire(point)
    assert point.review_status is state
    stored = db.scalar(
        text("select review_status::text from assessments where id = :i"), {"i": point.id}
    )
    assert stored == state.value


def test_unknown_review_status_is_rejected(db):
    point = add_point(db)
    with pytest.raises(DBAPIError):
        db.execute(
            text("update assessments set review_status = 'half_done' where id = :i"),
            {"i": point.id},
        )


def test_status_values_are_the_ones_the_hazard_map_already_uses():
    # the admin hazard API filters on these exact words
    assert [s.value for s in ReviewStatus] == ["open", "pending_review", "closed"]


def test_change_is_saved_with_who_and_why(db):
    admin = make_user("admin@example.com")
    db.add(admin)
    db.flush()
    point = add_point(db, review_status=ReviewStatus.PENDING_REVIEW)
    entry = add_change(
        db,
        point,
        to=ReviewStatus.OPEN,
        frm=ReviewStatus.PENDING_REVIEW,
        changed_by=admin.id,
        reason="Photo is too dark to see the brush",
    )
    db.refresh(entry)
    print("change:", entry, entry.reason)

    assert entry.id is not None and entry.created_at is not None
    assert entry.changed_by == admin.id
    assert entry.reason == "Photo is too dark to see the brush"


def test_first_entry_may_have_no_previous_status(db):
    point = add_point(db)
    entry = add_change(db, point, to=ReviewStatus.OPEN, frm=None)
    assert entry.from_status is None


def test_change_to_the_same_status_is_rejected(db):
    point = add_point(db)
    with pytest.raises(IntegrityError):
        add_change(db, point, to=ReviewStatus.OPEN, frm=ReviewStatus.OPEN)


def test_change_needs_a_target_status(db):
    point = add_point(db)
    db.add(AssessmentStatusChange(assessment_id=point.id, from_status=ReviewStatus.OPEN))
    with pytest.raises(IntegrityError):
        db.flush()


def test_change_needs_an_existing_assessment(db):
    db.add(AssessmentStatusChange(assessment_id=uuid.uuid4(), to_status=ReviewStatus.OPEN))
    with pytest.raises(IntegrityError):
        db.flush()


def test_history_comes_back_oldest_first(db):
    point = add_point(db)
    first = add_change(db, point, to=ReviewStatus.PENDING_REVIEW, frm=ReviewStatus.OPEN)
    db.execute(
        text(
            "update assessment_status_changes set created_at = now() - interval '1 day' "
            "where id = :i"
        ),
        {"i": first.id},
    )
    add_change(db, point, to=ReviewStatus.CLOSED, frm=ReviewStatus.PENDING_REVIEW)
    db.expire_all()

    trail = [c.to_status for c in point.status_changes]
    print("trail:", trail)
    assert trail == [ReviewStatus.PENDING_REVIEW, ReviewStatus.CLOSED]


def test_deleting_assessment_removes_its_history(db):
    point = add_point(db)
    add_change(db, point)
    add_change(db, point, to=ReviewStatus.CLOSED, frm=ReviewStatus.PENDING_REVIEW)
    pid = point.id

    db.delete(point)
    db.flush()
    left = db.scalar(
        select(func.count())
        .select_from(AssessmentStatusChange)
        .where(AssessmentStatusChange.assessment_id == pid)
    )
    assert left == 0


def test_deleting_the_user_keeps_the_history_but_not_the_name(db):
    admin = make_user("leaving@example.com")
    db.add(admin)
    db.flush()
    point = add_point(db)
    entry = add_change(db, point, changed_by=admin.id)

    db.delete(admin)
    db.flush()
    db.refresh(entry)
    assert entry.changed_by is None
    assert db.get(User, admin.id) is None

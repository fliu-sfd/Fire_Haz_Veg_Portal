import logging
from datetime import datetime

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import AppSetting, User, UserRole
from app.services.editable_messages import DISABLED_ACCOUNT_MESSAGE_KEY as KEY
from app.services.editable_messages import EDITABLE_MESSAGES
from app.services.settings_service import UnknownMessageError, message_text

pytestmark = pytest.mark.db

MESSAGES = "/api/v1/admin/settings/messages"
ONE = f"{MESSAGES}/{KEY}"
UNKNOWN = f"{MESSAGES}/no_such_message"
DEFAULT = EDITABLE_MESSAGES[KEY].default
NEW_TEXT = "Call the department at 555-0100."
FIELDS = {
    "key",
    "label",
    "description",
    "message",
    "default_message",
    "is_default",
    "min_length",
    "max_length",
    "max_lines",
    "updated_at",
    "updated_by_name",
}
ENDPOINTS = [
    ("GET", MESSAGES, None),
    ("GET", ONE, None),
    ("PUT", ONE, {"message": NEW_TEXT}),
    ("DELETE", ONE, None),
]


def add_user(db, email, role, name) -> User:
    user = User(email=email, password_hash="$argon2id$not-a-real-hash", full_name=name, role=role)
    db.add(user)
    db.commit()
    return user


def login_as(client, user: User) -> None:
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


def put(client, text, url=ONE):
    return client.put(url, json={"message": text})


@pytest.fixture
def admin(db) -> User:
    return add_user(db, "ava.admin@example.com", UserRole.ADMIN, "Ava Admin")


@pytest.fixture
def admin_client(client, admin):
    login_as(client, admin)
    return client


@pytest.mark.parametrize(("method", "url", "body"), ENDPOINTS)
def test_signed_out_gets_401(client, method, url, body) -> None:
    assert client.request(method, url, json=body).status_code == 401


@pytest.mark.parametrize(("method", "url", "body"), ENDPOINTS)
def test_resident_gets_403_and_changes_nothing(client, db, method, url, body) -> None:
    login_as(client, add_user(db, "carlos@example.com", UserRole.RESIDENT, "Carlos Rivera"))
    assert client.request(method, url, json=body).status_code == 403
    assert db.scalar(select(AppSetting)) is None


def test_list_returns_the_default_and_limits(admin_client) -> None:
    resp = admin_client.get(MESSAGES)
    assert resp.status_code == 200
    assert resp.json() == {
        "items": [
            {
                "key": KEY,
                "label": "Disabled account message",
                "description": "Shown when a disabled person signs in with the correct password.",
                "message": DEFAULT,
                "default_message": DEFAULT,
                "is_default": True,
                "min_length": 10,
                "max_length": 500,
                "max_lines": 3,
                "updated_at": None,
                "updated_by_name": None,
            }
        ]
    }


def test_get_one_with_nothing_saved_returns_the_default(admin_client) -> None:
    body = admin_client.get(ONE).json()
    assert body.keys() == FIELDS
    assert body["message"] == DEFAULT
    assert body["is_default"] is True


@pytest.mark.parametrize(
    ("method", "body"), [("GET", None), ("PUT", {"message": NEW_TEXT}), ("DELETE", None)]
)
def test_unknown_key_is_404(admin_client, method, body) -> None:
    resp = admin_client.request(method, UNKNOWN, json=body)
    assert resp.status_code == 404
    assert resp.json()["detail"] == {
        "code": "message_not_found",
        "message": "This message does not exist.",
        "field": None,
    }


def test_put_saves_the_text(admin_client) -> None:
    resp = put(admin_client, NEW_TEXT)
    assert resp.status_code == 200
    assert resp.json()["message"] == NEW_TEXT

    body = admin_client.get(ONE).json()
    assert body["message"] == NEW_TEXT
    assert body["default_message"] == DEFAULT
    assert body["is_default"] is False
    assert body["updated_by_name"] == "Ava Admin"
    assert datetime.fromisoformat(body["updated_at"]).tzinfo is not None


def test_saving_again_replaces_the_text_and_moves_updated_at(admin_client) -> None:
    first = put(admin_client, NEW_TEXT).json()
    second = put(admin_client, NEW_TEXT).json()
    third = put(admin_client, "Different words for this.").json()

    assert third["message"] == "Different words for this."
    assert first["updated_at"] < second["updated_at"] < third["updated_at"]


def test_text_equal_to_the_default_reports_is_default(admin_client) -> None:
    body = put(admin_client, f"  {DEFAULT}  ").json()
    assert body["message"] == DEFAULT
    assert body["is_default"] is True


def test_whitespace_is_trimmed_and_control_characters_removed(admin_client) -> None:
    body = put(admin_client, "  Call\x00 the   depart\x07ment. \n\n\n\n Thanks. ").json()
    assert body["message"] == "Call the department.\n\nThanks."


@pytest.mark.parametrize(
    ("text", "error"),
    [
        ("", "Message must be at least 10 characters"),
        ("   \n   ", "Message must be at least 10 characters"),
        ("Too short", "Message must be at least 10 characters"),
        ("x" * 501, "Message must be at most 500 characters"),
        ("line one\nline two\nline three\nline four", "Message must be at most 3 lines"),
    ],
    ids=["empty", "blank", "short", "long", "lines"],
)
def test_rule_failures_are_422_under_the_message_field(admin_client, db, text, error) -> None:
    resp = put(admin_client, text)
    assert resp.status_code == 422
    assert resp.json()["detail"] == {
        "code": "invalid_message",
        "message": error,
        "field": "message",
    }
    assert db.scalar(select(AppSetting)) is None


def test_limits_are_inclusive(admin_client) -> None:
    assert put(admin_client, "x" * 10).status_code == 200
    assert put(admin_client, "x" * 500).status_code == 200
    assert put(admin_client, "line one\nline two\nline three").status_code == 200


def test_html_is_stored_and_returned_unchanged(admin_client, db) -> None:
    text = "<script>alert(1)</script> call 555-0100"
    assert put(admin_client, text).json()["message"] == text
    assert admin_client.get(ONE).json()["message"] == text
    assert db.scalar(select(AppSetting.value).where(AppSetting.key == KEY)) == text


@pytest.mark.parametrize(
    "body",
    [
        {"message": NEW_TEXT, "updated_by": "someone"},
        {"message": NEW_TEXT, "max_length": 9999},
        {},
        {"message": 12345},
        {"message": None},
    ],
    ids=["unknown-field", "limit-from-client", "missing", "number", "null"],
)
def test_bad_body_is_422(admin_client, db, body) -> None:
    assert admin_client.put(ONE, json=body).status_code == 422
    assert db.scalar(select(AppSetting)) is None


def test_delete_brings_the_default_back_and_can_repeat(admin_client, db) -> None:
    put(admin_client, NEW_TEXT)

    resp = admin_client.delete(ONE)
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == DEFAULT
    assert body["is_default"] is True
    assert body["updated_at"] is None
    assert body["updated_by_name"] is None
    assert db.scalar(select(AppSetting)) is None

    assert admin_client.delete(ONE).status_code == 200


def test_a_second_admin_saving_changes_the_name(admin_client, db) -> None:
    put(admin_client, NEW_TEXT)
    login_as(admin_client, add_user(db, "ben@example.com", UserRole.ADMIN, "Ben Boss"))
    assert put(admin_client, "Ben's wording goes here.").json()["updated_by_name"] == "Ben Boss"


def test_removing_the_admin_leaves_the_message_with_no_name(admin_client, db, admin) -> None:
    put(admin_client, NEW_TEXT)
    login_as(admin_client, add_user(db, "ben@example.com", UserRole.ADMIN, "Ben Boss"))

    db.delete(admin)
    db.commit()

    body = admin_client.get(ONE).json()
    assert body["message"] == NEW_TEXT
    assert body["updated_by_name"] is None
    assert body["updated_at"] is not None


def test_a_row_not_in_the_registry_is_ignored_and_kept(admin_client, db) -> None:
    db.add(AppSetting(key="retired_message", value="Old words"))
    db.commit()

    resp = admin_client.get(MESSAGES)
    assert resp.status_code == 200
    assert [item["key"] for item in resp.json()["items"]] == [KEY]
    assert admin_client.get(f"{MESSAGES}/retired_message").status_code == 404
    assert db.get(AppSetting, "retired_message") is not None


def test_logs_name_the_admin_and_key_but_never_the_text(admin_client, admin, caplog) -> None:
    with caplog.at_level(logging.INFO, logger="app.services.settings_service"):
        put(admin_client, NEW_TEXT)
        admin_client.delete(ONE)

    assert len(caplog.records) == 2
    for record in caplog.records:
        line = record.getMessage()
        assert str(admin.id) in line
        assert KEY in line
        assert NEW_TEXT not in line


def test_message_text_falls_back_then_uses_the_saved_text(admin_client, db) -> None:
    assert message_text(db, KEY) == DEFAULT
    put(admin_client, NEW_TEXT)
    assert message_text(db, KEY) == NEW_TEXT


def test_message_text_rejects_a_key_not_in_the_registry(db) -> None:
    with pytest.raises(UnknownMessageError):
        message_text(db, "no_such_message")

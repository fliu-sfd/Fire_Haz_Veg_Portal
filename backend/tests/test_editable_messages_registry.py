"""Protects future additions to the registry. Needs no database."""

import re

import pytest

from app.schemas.validators import clean_message
from app.services.editable_messages import (
    DISABLED_ACCOUNT_MESSAGE_KEY,
    EDITABLE_MESSAGES,
    EditableMessage,
)

ENTRIES = list(EDITABLE_MESSAGES.values())
SPEC = EditableMessage(
    key="test_message",
    label="Test",
    description="Used in tests.",
    default="Default text.",
    min_length=10,
    max_length=40,
    max_lines=3,
)


def by_key(entry: EditableMessage) -> str:
    return entry.key


def test_disabled_account_message_is_registered() -> None:
    entry = EDITABLE_MESSAGES[DISABLED_ACCOUNT_MESSAGE_KEY]
    assert entry.default == "Account is disabled. Contact the Scottsdale Fire Department."
    assert (entry.min_length, entry.max_length, entry.max_lines) == (10, 500, 3)


@pytest.mark.parametrize("entry", ENTRIES, ids=by_key)
def test_key_matches_its_dictionary_entry_and_format(entry: EditableMessage) -> None:
    assert EDITABLE_MESSAGES[entry.key] is entry
    assert len(entry.key) <= 64  # app_settings.key column
    assert re.fullmatch(r"[a-z0-9_]+", entry.key)


def test_keys_are_unique() -> None:
    keys = [entry.key for entry in ENTRIES]
    assert len(keys) == len(set(keys))


@pytest.mark.parametrize("entry", ENTRIES, ids=by_key)
def test_label_and_description_are_not_blank(entry: EditableMessage) -> None:
    assert entry.label.strip()
    assert entry.description.strip()


@pytest.mark.parametrize("entry", ENTRIES, ids=by_key)
def test_limits_make_sense(entry: EditableMessage) -> None:
    assert entry.min_length <= entry.max_length
    assert entry.max_lines >= 1


@pytest.mark.parametrize("entry", ENTRIES, ids=by_key)
def test_default_passes_its_own_rules_unchanged(entry: EditableMessage) -> None:
    assert clean_message(entry.default, entry) == entry.default


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  Call the department  ", "Call the department"),
        ("Call   the    department", "Call the department"),
        ("First line here\nSecond line", "First line here\nSecond line"),
        ("First line here\r\nSecond line", "First line here\nSecond line"),
        ("First line here  \n  Second line", "First line here\nSecond line"),
        ("\n\nCall the department\n\n", "Call the department"),
        ("First line here\n\n\n\nLast line", "First line here\n\nLast line"),
        ("First line here\n \n \nLast line", "First line here\n\nLast line"),
        ("Call\x00 the\x07 depart\x1fment", "Call the department"),
        ("<b>Call</b> & <i>ask</i>", "<b>Call</b> & <i>ask</i>"),
    ],
)
def test_clean_message_tidies_text(raw: str, expected: str) -> None:
    assert clean_message(raw, SPEC) == expected
    assert clean_message(expected, SPEC) == expected


@pytest.mark.parametrize(
    ("raw", "error"),
    [
        ("", "Message must be at least 10 characters"),
        (" \n \n ", "Message must be at least 10 characters"),
        ("Too short", "Message must be at least 10 characters"),
        ("x" * 41, "Message must be at most 40 characters"),
        ("one line\ntwo line\nthree line\nfour", "Message must be at most 3 lines"),
    ],
)
def test_clean_message_rejects_text_outside_the_limits(raw: str, error: str) -> None:
    with pytest.raises(ValueError, match=error):
        clean_message(raw, SPEC)


def test_a_one_line_limit_reads_correctly() -> None:
    one_line = EditableMessage(
        key="one_line",
        label="One line",
        description="Used in tests.",
        default="Default text.",
        min_length=1,
        max_length=40,
        max_lines=1,
    )
    with pytest.raises(ValueError, match="Message must be at most 1 line$"):
        clean_message("first\nsecond", one_line)


def test_length_is_measured_after_cleaning() -> None:
    assert clean_message(" " * 100 + "x" * 40 + " " * 100, SPEC) == "x" * 40

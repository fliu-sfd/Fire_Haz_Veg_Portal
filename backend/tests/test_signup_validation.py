import pytest
from pydantic import ValidationError

from app.schemas.auth import SignupRequest

GOOD_PASSWORD = "Wildfire#Safe2026"


def signup(**overrides) -> SignupRequest:
    data = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "password": GOOD_PASSWORD,
        "confirm_password": GOOD_PASSWORD,
    }
    data.update(overrides)
    if "password" in overrides and "confirm_password" not in overrides:
        data["confirm_password"] = overrides["password"]
    return SignupRequest(**data)


def error_for(field: str, **overrides) -> str:
    with pytest.raises(ValidationError) as exc:
        signup(**overrides)
    errors = exc.value.errors()
    print(field, "->", [(e["loc"], e["msg"]) for e in errors])
    matches = [e["msg"] for e in errors if e["loc"] == (field,)]
    assert matches, f"expected an error on {field!r}, got {errors}"
    return matches[0]


def test_valid_signup_minimal() -> None:
    req = signup()
    assert req.full_name == "Jane Doe"
    assert req.email == "jane@example.com"
    assert req.phone is None


# --- full name ---


def test_full_name_is_trimmed_and_spaces_collapsed() -> None:
    assert signup(full_name="   Jane     Van   Doe  ").full_name == "Jane Van Doe"


@pytest.mark.parametrize(
    "name", ["Mary-Jane O'Neil", "J. R. Smith", "José Núñez", "Li", "Jean-Luc Picard Jr."]
)
def test_full_name_accepts_real_names(name: str) -> None:
    assert signup(full_name=name).full_name == name


@pytest.mark.parametrize("name", ["", "   ", "J"])
def test_full_name_too_short(name: str) -> None:
    assert "at least 2" in error_for("full_name", full_name=name)


def test_full_name_too_long() -> None:
    assert "at most 120" in error_for("full_name", full_name="A" * 121)


def test_full_name_max_length_ok() -> None:
    assert len(signup(full_name="A" * 120).full_name) == 120


@pytest.mark.parametrize("name", ["Jane2 Doe", "Jane_Doe", "Jane@Doe", "-Jane", "Jane 🔥", "--"])
def test_full_name_rejects_symbols_and_digits(name: str) -> None:
    assert "may only contain" in error_for("full_name", full_name=name)


# --- email ---


def test_email_trimmed_and_lowercased() -> None:
    assert signup(email="  Jane.Doe@Example.COM ").email == "jane.doe@example.com"


@pytest.mark.parametrize(
    "email", ["", "jane", "jane@", "@example.com", "jane@@example.com", "jane doe@example.com"]
)
def test_email_rejects_invalid(email: str) -> None:
    error_for("email", email=email)


def test_email_too_long() -> None:
    error_for("email", email=f"{'a' * 64}@{'b' * 63}.{'c' * 63}.{'d' * 63}.com")


# --- password ---


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("Sh0rt!pass", "at least 12"),
        ("A1!" + "a" * 126, "at most 128"),
        (" Wildfire#Safe2026", "whitespace"),
        ("Wildfire#Safe2026 ", "whitespace"),
        ("wildfire#safe2026", "uppercase"),
        ("WILDFIRE#SAFE2026", "lowercase"),
        ("Wildfire#SafeNow", "digit"),
        ("WildfireSafe2026", "special"),
    ],
)
def test_password_strength_rules(password: str, message: str) -> None:
    assert message in error_for("password", password=password)


def test_password_mismatch() -> None:
    msg = error_for("confirm_password", confirm_password="Wildfire#Safe2027")
    assert "do not match" in msg


def test_mismatch_not_reported_when_password_itself_invalid() -> None:
    with pytest.raises(ValidationError) as exc:
        signup(password="weak", confirm_password="different")
    locs = [e["loc"] for e in exc.value.errors()]
    assert ("password",) in locs
    assert ("confirm_password",) not in locs


@pytest.mark.parametrize("password", ["Jane#Secure2026x", "MyDOE!Password99", "Xx#JaneDoe#2026"])
def test_password_must_not_contain_name(password: str) -> None:
    with pytest.raises(ValidationError, match="must not contain your name or email"):
        signup(password=password)


def test_password_must_not_contain_email_local_part() -> None:
    with pytest.raises(ValidationError, match="must not contain your name or email"):
        signup(email="firewatch@example.com", password="Big#FireWatch2026")


# --- phone ---


@pytest.mark.parametrize(
    "phone",
    [
        "4805551234",
        "(480) 555-1234",
        "480-555-1234",
        "480.555.1234",
        "+1 480 555 1234",
        "1-480-555-1234",
        "  +14805551234  ",
    ],
)
def test_phone_normalized_to_e164(phone: str) -> None:
    assert signup(phone=phone).phone == "+14805551234"


@pytest.mark.parametrize("phone", ["", "   ", None])
def test_phone_blank_is_none(phone: str | None) -> None:
    assert signup(phone=phone).phone is None


@pytest.mark.parametrize(
    "phone",
    [
        "480555123",  # 9 digits
        "24805551234",  # 11 digits not starting with 1
        "0805551234",  # area code starts with 0
        "1805551234x",  # letter
        "180555123",
        "4801551234",  # exchange starts with 1
        "+44 20 7946 0958",  # non-US
        "480-555-12345",
    ],
)
def test_phone_rejects_invalid(phone: str) -> None:
    error_for("phone", phone=phone)


# --- unknown fields ---


@pytest.mark.parametrize("field", ["role", "is_active", "email_verified"])
def test_extra_fields_rejected(field: str) -> None:
    error_for(field, **{field: "admin"})

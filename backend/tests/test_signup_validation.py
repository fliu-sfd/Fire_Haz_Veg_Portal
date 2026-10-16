import pytest
from pydantic import ValidationError

from app.schemas.auth import SignupRequest

GOOD_PASSWORD = "Wildfire#Safe2026"


def signup(**overrides) -> SignupRequest:
    data = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "property_address": "7575 E Main St",
        "asset_id": "A-1001",
        "password": GOOD_PASSWORD,
    }
    data.update(overrides)
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
    assert req.property_address == "7575 E Main St"
    assert req.asset_id == "A-1001"


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


@pytest.mark.parametrize("password", ["Jane#Secure2026x", "MyDOE!Password99", "Xx#JaneDoe#2026"])
def test_password_must_not_contain_name(password: str) -> None:
    with pytest.raises(ValidationError, match="must not contain your name or email"):
        signup(password=password)


def test_password_must_not_contain_email_local_part() -> None:
    with pytest.raises(ValidationError, match="must not contain your name or email"):
        signup(email="firewatch@example.com", password="Big#FireWatch2026")


# --- property verification fields ---


def test_property_address_is_trimmed_and_spaces_collapsed() -> None:
    assert signup(property_address="  7575   E Main St  ").property_address == "7575 E Main St"


@pytest.mark.parametrize("address", ["", "   ", "123"])
def test_property_address_rejects_short_values(address: str) -> None:
    error_for("property_address", property_address=address)


def test_asset_id_is_trimmed_and_uppercased() -> None:
    assert signup(asset_id="  a-1001 ").asset_id == "A-1001"


@pytest.mark.parametrize("asset_id", ["", "A 1001", "A/1001", "A.1001"])
def test_asset_id_rejects_invalid_values(asset_id: str) -> None:
    error_for("asset_id", asset_id=asset_id)


# --- unknown fields ---


@pytest.mark.parametrize(
    "field", ["role", "is_active", "email_verified", "confirm_password", "phone"]
)
def test_extra_fields_rejected(field: str) -> None:
    error_for(field, **{field: "admin"})

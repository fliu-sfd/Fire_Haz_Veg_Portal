import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest


def test_email_trimmed_and_lowercased() -> None:
    req = LoginRequest(email="  Jane.Doe@Example.COM ", password="x")
    assert req.email == "jane.doe@example.com"


def test_password_not_trimmed_or_strength_checked() -> None:
    # strength rules are for signup only; login just needs a value
    assert LoginRequest(email="a@example.com", password=" weak ").password == " weak "


@pytest.mark.parametrize(
    ("data", "field"),
    [
        ({"email": "not-an-email", "password": "x"}, "email"),
        ({"email": "", "password": "x"}, "email"),
        ({"password": "x"}, "email"),
        ({"email": "a@example.com", "password": ""}, "password"),
        ({"email": "a@example.com", "password": "x" * 129}, "password"),
        ({"email": "a@example.com"}, "password"),
        ({"email": "a@example.com", "password": "x", "remember": True}, "remember"),
    ],
)
def test_invalid_login_payloads(data: dict, field: str) -> None:
    with pytest.raises(ValidationError) as exc:
        LoginRequest(**data)
    assert (field,) in [e["loc"] for e in exc.value.errors()]

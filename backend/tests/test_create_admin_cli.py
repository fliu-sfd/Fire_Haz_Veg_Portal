import pytest
from sqlalchemy import func, select

from app.cli import create_admin as cli
from app.core.security import verify_password
from app.models import User, UserRole

pytestmark = pytest.mark.db

EMAIL = "ava.admin@example.com"
NAME = "Ava Admin"
PASSWORD = "Wildfire#Safe2026"
ARGS = ["--email", EMAIL, "--name", NAME]


@pytest.fixture
def run(db, monkeypatch, capsys):
    """Call main() against the test session, with the typed passwords patched in."""
    monkeypatch.setattr(cli, "SessionLocal", lambda: db)

    def _run(*typed: str, args: list[str] = ARGS) -> tuple[int, str]:
        answers = iter(typed)
        monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt: next(answers))
        code = cli.main(args)
        captured = capsys.readouterr()
        return code, captured.out + captured.err

    return _run


def user_count(db) -> int:
    return db.scalar(select(func.count()).select_from(User))


def test_creates_an_active_admin(run, db) -> None:
    code, output = run(PASSWORD, PASSWORD)
    user = db.scalar(select(User))

    assert code == 0
    assert (user.email, user.full_name) == (EMAIL, NAME)
    assert user.role is UserRole.ADMIN
    assert user.is_active is True
    assert verify_password(PASSWORD, user.password_hash)
    assert output.strip() == f"Created admin account for {EMAIL}"
    assert PASSWORD not in output and user.password_hash not in output


def test_new_admin_can_sign_in(run, client) -> None:
    run(PASSWORD, PASSWORD)
    resp = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_cleans_email_and_name_like_signup(run, db) -> None:
    code, _ = run(
        PASSWORD, PASSWORD, args=["--email", " Ava.Admin@Example.COM ", "--name", " Ava   Admin "]
    )
    user = db.scalar(select(User))
    assert code == 0
    assert (user.email, user.full_name) == (EMAIL, NAME)


def test_duplicate_email_changes_nothing(run, db) -> None:
    db.add(User(email=EMAIL, password_hash="original", full_name="Old Name"))
    db.commit()

    # no answers are queued: asking for a password here would raise StopIteration
    code, output = run(args=["--email", EMAIL.upper(), "--name", NAME])

    user = db.scalar(select(User))
    assert code == 1
    assert "already exists" in output
    assert user_count(db) == 1
    assert (user.full_name, user.password_hash) == ("Old Name", "original")
    assert user.role is UserRole.RESIDENT


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("Short#1a", "at least 12"),
        ("alllowercase#2026", "uppercase"),
        ("NoDigitsInHere#Now", "digit"),
        ("NoSpecialChars2026", "special"),
        ("Ava-Wildfire#2026", "name or email"),
    ],
)
def test_rejected_password_is_never_printed(run, db, password, message) -> None:
    code, output = run(password, password)
    assert code == 1
    assert message in output
    assert password not in output
    assert user_count(db) == 0


def test_passwords_must_match(run, db) -> None:
    other = "Different#Pass2026"
    code, output = run(PASSWORD, other)
    assert code == 1
    assert "do not match" in output
    assert PASSWORD not in output and other not in output
    assert user_count(db) == 0


@pytest.mark.parametrize(
    "args",
    [
        ["--email", "not-an-email", "--name", NAME],
        ["--email", f"{'x' * 250}@example.com", "--name", NAME],
        ["--email", EMAIL, "--name", "R2D2"],
    ],
)
def test_bad_email_or_name_stops_before_the_password(run, db, args) -> None:
    code, output = run(args=args)
    assert code == 1
    assert output.startswith("error: ")
    assert user_count(db) == 0


@pytest.mark.parametrize("stop", [EOFError, KeyboardInterrupt])
def test_cancelling_the_prompt_changes_nothing(db, monkeypatch, capsys, stop) -> None:
    def cancel(_prompt):
        raise stop

    monkeypatch.setattr(cli, "SessionLocal", lambda: db)
    monkeypatch.setattr(cli.getpass, "getpass", cancel)
    assert cli.main(ARGS) == 1
    assert "cancelled" in capsys.readouterr().err
    assert user_count(db) == 0


def test_password_cannot_be_an_argument(capsys) -> None:
    with pytest.raises(SystemExit) as stop:
        cli.build_parser().parse_args([*ARGS, "--password", PASSWORD])
    assert stop.value.code == 2
    assert "--password" in capsys.readouterr().err


def test_help_explains_the_command(capsys) -> None:
    with pytest.raises(SystemExit) as stop:
        cli.build_parser().parse_args(["--help"])
    assert stop.value.code == 0
    out = capsys.readouterr().out
    assert "--email" in out and "--name" in out

import pytest
from sqlalchemy.exc import OperationalError

from app.cli import wait_for_db as cli


class FakeEngine:
    """Fails with each queued error in turn, then connects."""

    def __init__(self, errors=()):
        self.errors = list(errors)
        self.attempts = 0

    def connect(self):
        self.attempts += 1
        if self.errors:
            raise self.errors.pop(0)
        return self

    def close(self):
        pass


def down() -> OperationalError:
    return OperationalError("SELECT 1", {}, Exception("connection refused"))


@pytest.fixture
def sleeps(monkeypatch) -> list[int]:
    waited: list[int] = []
    monkeypatch.setattr(cli.time, "sleep", waited.append)
    return waited


def test_returns_at_once_when_the_database_is_up(monkeypatch, sleeps, capsys) -> None:
    monkeypatch.setattr(cli, "engine", FakeEngine())
    assert cli.main() == 0
    assert sleeps == []
    assert capsys.readouterr().out == ""


def test_retries_until_the_database_is_up(monkeypatch, sleeps, capsys) -> None:
    engine = FakeEngine([down(), down()])
    monkeypatch.setattr(cli, "engine", engine)
    assert cli.main() == 0
    assert engine.attempts == 3
    assert sleeps == [cli.RETRY_SECONDS, cli.RETRY_SECONDS]
    assert "retrying in 2s (2/30)" in capsys.readouterr().out


def test_gives_up_with_the_reason(monkeypatch, sleeps, capsys) -> None:
    engine = FakeEngine([down() for _ in range(cli.MAX_TRIES)])
    monkeypatch.setattr(cli, "engine", engine)
    assert cli.main() == 1
    assert engine.attempts == cli.MAX_TRIES
    assert "not reachable, giving up: connection refused" in capsys.readouterr().out


def test_other_errors_are_not_retried(monkeypatch, sleeps) -> None:
    engine = FakeEngine([RuntimeError("bad setting")])
    monkeypatch.setattr(cli, "engine", engine)
    with pytest.raises(RuntimeError, match="bad setting"):
        cli.main()
    assert engine.attempts == 1
    assert sleeps == []

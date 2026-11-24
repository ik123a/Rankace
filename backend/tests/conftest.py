import os
import secrets
import socket
from tempfile import TemporaryDirectory
from pathlib import Path

import pytest


database = TemporaryDirectory(prefix="rankace-tests-")
database_path = Path(database.name, "test.db").as_posix()
os.environ["DATABASE_URL"] = f"sqlite:///{database_path}"
os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)
os.environ["DEMO_ENABLED"] = "false"


@pytest.fixture(autouse=True)
def resolve_fixture_hosts(monkeypatch):
    resolve = socket.getaddrinfo

    def fixture_dns(host, port, *args, **kwargs):
        if host == "example.com":
            return resolve("93.184.215.14", port, *args, **kwargs)
        return resolve(host, port, *args, **kwargs)

    monkeypatch.setattr(socket, "getaddrinfo", fixture_dns)


def pytest_sessionfinish():
    from app.core.database import engine
    engine.dispose()
    database.cleanup()

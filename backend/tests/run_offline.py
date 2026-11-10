"""Run the reviewed pure/parser tests with deterministic DNS and no sockets.

From backend/: python tests/run_offline.py
API/auth tests are deliberately excluded because they initialize and mutate DB state.
"""
import os
from pathlib import Path
import socket
import sys
from unittest.mock import patch


def resolve(host, *args, **kwargs):
    """Public example-domain fixture; retain private literal addresses for guards."""
    ip = host if host in ("127.0.0.1", "169.254.169.254") else "93.184.216.34"
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0))]


def block_connection(*args, **kwargs):
    raise AssertionError("network forbidden in offline tests")


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    os.environ["ENABLE_ML"] = "false"
    os.environ["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"
    import pytest
    with patch.object(socket, "getaddrinfo", resolve), patch.object(socket.socket, "connect", block_connection):
        return pytest.main([
            "tests/test_core.py", "tests/test_readiness.py",
            "tests/test_crawler_scrapling.py", "tests/test_fetch_boundaries.py", "-q",
        ])


if __name__ == "__main__":
    sys.exit(main())

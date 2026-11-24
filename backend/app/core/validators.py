import ipaddress
import socket
from urllib.parse import urlparse

import httpx


def public_target(raw: str) -> tuple[httpx.URL, list[str]]:
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("URL is required")
    if "://" not in raw:
        raw = "https://" + raw
    try:
        target = httpx.URL(raw)
    except httpx.InvalidURL as exc:
        raise ValueError("Invalid URL") from exc
    if (target.scheme not in {"http", "https"} or not target.host
            or target.username or target.password):
        raise ValueError("Use an HTTP(S) URL without credentials")
    host = target.raw_host.decode("ascii").rstrip(".")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Blocked host")

    try:
        records = socket.getaddrinfo(host, target.port, type=socket.SOCK_STREAM)
        addresses = list(dict.fromkeys(record[4][0] for record in records))
    except OSError as exc:
        raise ValueError("Could not resolve the website hostname") from exc
    if not addresses:
        raise ValueError("Could not resolve the website hostname")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global or ip.is_multicast or ip.is_reserved:
            raise ValueError("URL resolves to a non-public address")
    return target.copy_with(fragment=None), addresses


def validate_url(raw: str) -> str:
    target, _ = public_target(raw)
    return str(target)


def normalize_url(base: str, href: str) -> str | None:
    from urllib.parse import urljoin, urldefrag

    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    joined, _ = urldefrag(urljoin(base, href))
    parsed = urlparse(joined)
    if parsed.scheme not in ("http", "https"):
        return None
    if parsed.path.endswith((".pdf", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".css", ".js", ".ico")):
        return None
    base_host = urlparse(base).hostname
    if parsed.hostname != base_host:
        return None
    return joined.rstrip("/") or joined

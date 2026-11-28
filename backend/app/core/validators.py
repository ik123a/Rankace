import ipaddress
import socket
from urllib.parse import urlparse


BLOCKED_HOSTS = {"localhost"}
TIMEOUT = 15


def validate_url(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("URL is required")
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Invalid URL")
    host = parsed.hostname.lower()
    if host in BLOCKED_HOSTS or host.endswith(".local") or host.endswith(".internal"):
        raise ValueError("Blocked host")
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                raise ValueError("URL resolves to a private/internal address (SSRF blocked)")
    except ValueError:
        raise
    except Exception:
        pass
    return raw


def normalize_url(base: str, href: str) -> str | None:
    from urllib.parse import urljoin, urldefrag

    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    joined, _ = urldefrag(urljoin(base, href))
    parsed = urlparse(joined)
    if parsed.scheme not in ("http", "https"):
        return None
    if parsed.path.lower().endswith((".pdf", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".css", ".js", ".ico")):
        return None
    base_host = urlparse(base).hostname
    if parsed.hostname != base_host:
        return None
    return joined.rstrip("/") or joined

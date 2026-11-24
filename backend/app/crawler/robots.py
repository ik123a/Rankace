"""Robots policy shared by the crawler and readiness report."""
from dataclasses import dataclass
import re

from protego import Protego


@dataclass(frozen=True)
class RobotsPolicy:
    state: str
    rules: Protego | None = None

    @classmethod
    def from_response(cls, status: int, text: str):
        if 200 <= status < 300 and not re.match(r"\s*<(?:!doctype|html|head|body)\b", text, re.I):
            return cls("published", Protego.parse(text))
        if 400 <= status < 500 and status != 429:
            return cls("unavailable")
        return cls("unreachable")

    def allows(self, url: str, user_agent: str) -> bool:
        if self.rules is None:
            return self.state == "unavailable"
        return self.rules.can_fetch(url, user_agent)

    def delay(self, user_agent: str) -> float:
        return (self.rules.crawl_delay(user_agent) or 0.0) if self.rules is not None else 0.0

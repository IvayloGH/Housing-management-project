"""Best-effort local login throttle; use shared Redis/gateway limit in multi-worker deployment."""
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, status

_WINDOW = 15 * 60
_MAX_FAILURES = 5
_failures: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def _remove_old(events: deque[float], now: float) -> None:
    while events and events[0] <= now - _WINDOW:
        events.popleft()


def check_login_limit(identifier: str) -> None:
    now = monotonic()
    with _lock:
        events = _failures[identifier]
        _remove_old(events, now)
        if len(events) >= _MAX_FAILURES:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many login attempts. Please try again later.",
                headers={"Retry-After": str(_WINDOW)},
            )


def register_login_failure(identifier: str) -> None:
    now = monotonic()
    with _lock:
        events = _failures[identifier]
        _remove_old(events, now)
        events.append(now)


def clear_login_failures(identifier: str) -> None:
    with _lock:
        _failures.pop(identifier, None)

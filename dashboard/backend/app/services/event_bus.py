"""Simple asyncio event bus for WebSocket broadcasting."""

import asyncio
from datetime import datetime, timezone
from typing import Any


class EventBus:
    """Singleton pub/sub event bus backed by asyncio queues."""

    _instance: "EventBus | None" = None

    def __new__(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if not hasattr(self, "_subscribers"):
            self._subscribers: list[asyncio.Queue] = []

    async def publish(self, event_type: str, data: dict[str, Any] | None = None) -> None:
        """Publish an event to all subscribers."""
        event = {
            "type": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # Deliver to all active subscribers; drop if queue is full
        dead: list[asyncio.Queue] = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Slow consumer — skip this event rather than blocking
                pass
            except Exception:
                dead.append(q)
        for q in dead:
            self._subscribers.remove(q)

    def subscribe(self, maxsize: int = 256) -> asyncio.Queue:
        """Create a new subscription queue and return it."""
        q: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Remove a subscription queue."""
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def publish_sync(self, event_type: str, data: dict[str, Any] | None = None) -> None:
        """Thread-safe publish from non-async context (e.g. automation callback)."""
        event = {
            "type": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
            except (asyncio.QueueFull, Exception):
                pass

    async def subscribe_iter(self, maxsize: int = 256):
        """Async generator that yields events as they arrive."""
        q = self.subscribe(maxsize)
        try:
            while True:
                event = await q.get()
                yield event
        finally:
            self.unsubscribe(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


# Module-level singleton
_bus = EventBus()


async def publish(event_type: str, data: dict[str, Any] | None = None) -> None:
    await _bus.publish(event_type, data)


def subscribe(maxsize: int = 256) -> asyncio.Queue:
    return _bus.subscribe(maxsize)


def unsubscribe(q: asyncio.Queue) -> None:
    _bus.unsubscribe(q)


def get_bus() -> EventBus:
    return _bus

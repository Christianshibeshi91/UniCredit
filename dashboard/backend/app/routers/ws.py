import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.event_bus import get_bus

event_bus = get_bus()
from app.services.automation_controller import set_event_callback

router = APIRouter()

# WebSocket connection manager
_connections: set[WebSocket] = set()


async def _broadcast(event: dict):
    dead = set()
    for ws in _connections:
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    _connections -= dead


def _on_automation_event(event_type: str, data: dict):
    """Callback from automation controller — publish to event bus."""
    event_bus.publish_sync(event_type, data)


# Wire up automation controller events
set_event_callback(_on_automation_event)


async def _event_consumer():
    """Consume events from the bus and broadcast to WebSocket clients."""
    async for event in event_bus.subscribe_iter():
        await _broadcast(event)


# Start consumer task on module load
_consumer_task: asyncio.Task | None = None


def _ensure_consumer():
    global _consumer_task
    if _consumer_task is None or _consumer_task.done():
        try:
            loop = asyncio.get_running_loop()
            _consumer_task = loop.create_task(_event_consumer())
        except RuntimeError:
            pass  # No running loop yet, will start on first connection


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    _ensure_consumer()
    await ws.accept()
    _connections.add(ws)

    # Send initial status
    from app.services.automation_controller import get_status
    await ws.send_json({
        "type": "automation_status",
        "data": {"status": get_status()},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_json({"type": "pong", "data": {}, "timestamp": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        pass
    finally:
        _connections.discard(ws)

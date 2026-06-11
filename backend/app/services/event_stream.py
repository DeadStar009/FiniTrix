from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, AsyncGenerator, Dict, List


class EventStream:
    def __init__(self) -> None:
        self._queues: Dict[str, asyncio.Queue[Dict[str, Any]]] = {}
        self._buffers: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def ensure(self, analysis_id: str) -> None:
        if analysis_id not in self._queues:
            self._queues[analysis_id] = asyncio.Queue()

    def add(self, analysis_id: str, event: Dict[str, Any]) -> None:
        self.ensure(analysis_id)
        self._buffers[analysis_id].append(event)
        self._queues[analysis_id].put_nowait(event)

    def get_buffer(self, analysis_id: str) -> List[Dict[str, Any]]:
        return list(self._buffers.get(analysis_id, []))

    async def stream(self, analysis_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        self.ensure(analysis_id)
        while True:
            event = await self._queues[analysis_id].get()
            yield event

import asyncio
import hashlib
import json
import time
from typing import Any

import anthropic

from app.config import settings
from app.errors import LLMUpstreamError

# ------------------------------------------------------------------
# Tool schemas
# ------------------------------------------------------------------

_CATEGORIZE_TOOL: dict[str, Any] = {
    "name": "propose_category",
    "description": "Propose a category and tags for the given task.",
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {"type": "string", "description": "Short category name (1-3 words)"},
            "tags": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 5,
                "description": "Relevant tags",
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Confidence score",
            },
        },
        "required": ["category", "tags", "confidence"],
    },
}

_DECOMPOSE_TOOL: dict[str, Any] = {
    "name": "propose_subtasks",
    "description": "Break the task into smaller actionable subtasks.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subtasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["title"],
                },
                "minItems": 2,
                "maxItems": 10,
            }
        },
        "required": ["subtasks"],
    },
}

_PRIORITY_TOOL: dict[str, Any] = {
    "name": "propose_priority",
    "description": "Suggest an appropriate priority level for the task.",
    "input_schema": {
        "type": "object",
        "properties": {
            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
            "rationale": {"type": "string", "description": "Brief explanation (1-2 sentences)"},
        },
        "required": ["priority", "rationale"],
    },
}

_WORKLOAD_TOOL: dict[str, Any] = {
    "name": "propose_workload_summary",
    "description": "Summarise the user's current task workload.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string", "description": "Natural-language summary paragraph"},
            "overdue_count": {"type": "integer", "minimum": 0},
            "upcoming_count": {"type": "integer", "minimum": 0},
        },
        "required": ["summary", "overdue_count", "upcoming_count"],
    },
}

# ------------------------------------------------------------------
# Cache entry
# ------------------------------------------------------------------

_CACHE_TTL_SECONDS = 3600


class _CacheEntry:
    def __init__(self, value: Any) -> None:
        self.value = value
        self.created_at = time.monotonic()

    def is_valid(self) -> bool:
        return time.monotonic() - self.created_at < _CACHE_TTL_SECONDS


# ------------------------------------------------------------------
# Service
# ------------------------------------------------------------------


class LLMService:
    def __init__(self, client: anthropic.Anthropic | None = None) -> None:
        self._client = client or anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._cache: dict[str, _CacheEntry] = {}
        self._in_flight: dict[str, asyncio.Lock] = {}

    def _cache_key(self, feature: str, payload: dict[str, Any]) -> str:
        raw = feature + json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _call_tool(
        self,
        system: str,
        tool: dict[str, Any],
        user_message: str,
    ) -> dict[str, Any]:
        """Call the LLM and extract tool-use result. Sync — wraps anthropic SDK."""
        try:
            response = self._client.messages.create(
                model=settings.llm_model,
                max_tokens=1024,
                system=system,
                tools=[tool],
                tool_choice={"type": "any"},
                messages=[{"role": "user", "content": user_message}],
            )
        except anthropic.APIError as exc:
            raise LLMUpstreamError(f"Anthropic API error: {exc}") from exc

        for block in response.content:
            if block.type == "tool_use":
                return block.input  # type: ignore[return-value]

        raise LLMUpstreamError("LLM did not return a tool-use block")

    def _cached_call(
        self,
        feature: str,
        payload: dict[str, Any],
        system: str,
        tool: dict[str, Any],
        user_message: str,
    ) -> dict[str, Any]:
        key = self._cache_key(feature, payload)
        entry = self._cache.get(key)
        if entry and entry.is_valid():
            return entry.value
        result = self._call_tool(system, tool, user_message)
        self._cache[key] = _CacheEntry(result)
        return result

    # ------------------------------------------------------------------
    # Public feature methods
    # ------------------------------------------------------------------

    def categorize(self, title: str, description: str | None = None) -> dict[str, Any]:
        payload = {"title": title, "description": description}
        system = (
            "You are a task management assistant. "
            "Given a task title and optional description, propose a concise category "
            "(e.g. 'Work', 'Personal', 'Health', 'Finance', 'Learning') "
            "and up to 5 relevant tags. Always call the propose_category tool."
        )
        user = f"Task title: {title}"
        if description:
            user += f"\nDescription: {description}"
        return self._cached_call("categorize", payload, system, _CATEGORIZE_TOOL, user)

    def decompose(
        self, title: str, description: str | None = None
    ) -> dict[str, Any]:
        payload = {"title": title, "description": description}
        system = (
            "You are a task management assistant. "
            "Break the given task into 2-8 smaller, actionable subtasks. "
            "Each subtask should be completable independently. "
            "Always call the propose_subtasks tool."
        )
        user = f"Task: {title}"
        if description:
            user += f"\nDetails: {description}"
        return self._cached_call("decompose", payload, system, _DECOMPOSE_TOOL, user)

    def suggest_priority(
        self,
        title: str,
        description: str | None = None,
        due_date: str | None = None,
    ) -> dict[str, Any]:
        payload = {"title": title, "description": description, "due_date": due_date}
        system = (
            "You are a task management assistant. "
            "Based on the task title, description, and optional due date, "
            "suggest an appropriate priority (low/medium/high) with a brief rationale. "
            "Consider urgency (due date proximity) and importance (task description). "
            "Always call the propose_priority tool."
        )
        user = f"Task: {title}"
        if description:
            user += f"\nDescription: {description}"
        if due_date:
            user += f"\nDue date: {due_date}"
        return self._cached_call("suggest_priority", payload, system, _PRIORITY_TOOL, user)

    def workload_summary(self, tasks: list[dict[str, Any]]) -> dict[str, Any]:
        payload = {"tasks": tasks}
        system = (
            "You are a task management assistant. "
            "Given a list of tasks with their titles, priorities, statuses, and due dates, "
            "provide a natural-language summary of the user's current workload. "
            "Mention overdue tasks, upcoming deadlines, and overall load. "
            "Be concise (2-4 sentences). "
            "Always call the propose_workload_summary tool."
        )
        task_lines = []
        for t in tasks:
            line = f"- [{t.get('status','?')}][{t.get('priority','?')}] {t.get('title','?')}"
            if t.get("due_date"):
                line += f" (due: {t['due_date']})"
            task_lines.append(line)
        user = "Current tasks:\n" + "\n".join(task_lines) if task_lines else "No tasks."
        return self._cached_call("workload_summary", payload, system, _WORKLOAD_TOOL, user)


# Singleton for use in routes
_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

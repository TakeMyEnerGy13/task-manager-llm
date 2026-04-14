from unittest.mock import MagicMock, patch

import pytest

from app.errors import LLMUpstreamError
from app.services.llm import LLMService


def _make_tool_use_response(tool_name: str, input_data: dict) -> MagicMock:
    """Build a fake anthropic Messages response with a tool_use block."""
    block = MagicMock()
    block.type = "tool_use"
    block.name = tool_name
    block.input = input_data

    response = MagicMock()
    response.content = [block]
    return response


def make_service(fake_response) -> LLMService:
    client = MagicMock()
    client.messages.create.return_value = fake_response
    return LLMService(client=client)


# --- categorize ---

def test_categorize_returns_parsed_result() -> None:
    fake = _make_tool_use_response(
        "propose_category",
        {"category": "Work", "tags": ["project", "backend"], "confidence": 0.9},
    )
    svc = make_service(fake)
    result = svc.categorize("Build API endpoint", "FastAPI route for tasks")
    assert result["category"] == "Work"
    assert "backend" in result["tags"]
    assert result["confidence"] == 0.9


def test_categorize_is_cached() -> None:
    fake = _make_tool_use_response(
        "propose_category",
        {"category": "Work", "tags": [], "confidence": 0.8},
    )
    svc = make_service(fake)
    svc.categorize("Same title")
    svc.categorize("Same title")
    assert svc._client.messages.create.call_count == 1


# --- decompose ---

def test_decompose_returns_subtasks() -> None:
    subtasks = [
        {"title": "Sub 1", "description": "details"},
        {"title": "Sub 2"},
    ]
    fake = _make_tool_use_response("propose_subtasks", {"subtasks": subtasks})
    svc = make_service(fake)
    result = svc.decompose("Big project")
    assert len(result["subtasks"]) == 2
    assert result["subtasks"][0]["title"] == "Sub 1"


# --- suggest_priority ---

def test_suggest_priority_returns_priority_and_rationale() -> None:
    fake = _make_tool_use_response(
        "propose_priority",
        {"priority": "high", "rationale": "Due soon and critical."},
    )
    svc = make_service(fake)
    result = svc.suggest_priority("Deploy to production", due_date="2026-04-15")
    assert result["priority"] == "high"
    assert "critical" in result["rationale"]


# --- workload_summary ---

def test_workload_summary_returns_summary() -> None:
    fake = _make_tool_use_response(
        "propose_workload_summary",
        {"summary": "You have 3 tasks.", "overdue_count": 1, "upcoming_count": 2},
    )
    svc = make_service(fake)
    tasks = [{"title": "T1", "status": "pending", "priority": "high", "due_date": None}]
    result = svc.workload_summary(tasks)
    assert result["overdue_count"] == 1
    assert "3 tasks" in result["summary"]


# --- error handling ---

def test_llm_upstream_error_on_api_error() -> None:
    import anthropic as ant

    client = MagicMock()
    client.messages.create.side_effect = ant.APIStatusError(
        "rate limit", response=MagicMock(status_code=429), body={}
    )
    svc = LLMService(client=client)
    with pytest.raises(LLMUpstreamError):
        svc.categorize("Some task")


def test_llm_upstream_error_when_no_tool_block() -> None:
    response = MagicMock()
    response.content = []  # no tool_use block
    svc = make_service(response)
    with pytest.raises(LLMUpstreamError):
        svc.categorize("Some task")

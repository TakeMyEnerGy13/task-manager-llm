from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.llm import LLMService, get_llm_service


def _mock_service(**methods) -> LLMService:
    svc = MagicMock(spec=LLMService)
    for name, return_value in methods.items():
        getattr(svc, name).return_value = return_value
    return svc


@pytest.fixture()
def llm_client(client: TestClient):
    """client fixture (from conftest) with LLM service mocked."""
    return client


def _override(svc: LLMService):
    app.dependency_overrides[get_llm_service] = lambda: svc


def _clear():
    app.dependency_overrides.pop(get_llm_service, None)


def test_categorize_endpoint(llm_client: TestClient) -> None:
    svc = _mock_service(
        categorize={"category": "Work", "tags": ["api"], "confidence": 0.95}
    )
    _override(svc)
    try:
        r = llm_client.post("/api/llm/categorize", json={"title": "Build API"})
        assert r.status_code == 200
        body = r.json()
        assert body["category"] == "Work"
        assert body["confidence"] == 0.95
    finally:
        _clear()


def test_decompose_endpoint(llm_client: TestClient) -> None:
    svc = _mock_service(
        decompose={"subtasks": [{"title": "Step 1"}, {"title": "Step 2"}]}
    )
    _override(svc)
    try:
        r = llm_client.post("/api/llm/decompose", json={"title": "Complex task"})
        assert r.status_code == 200
        assert len(r.json()["subtasks"]) == 2
    finally:
        _clear()


def test_suggest_priority_endpoint(llm_client: TestClient) -> None:
    svc = _mock_service(
        suggest_priority={"priority": "high", "rationale": "Urgent deadline"}
    )
    _override(svc)
    try:
        r = llm_client.post(
            "/api/llm/suggest-priority",
            json={"title": "Deploy hotfix", "due_date": "2026-04-15"},
        )
        assert r.status_code == 200
        assert r.json()["priority"] == "high"
    finally:
        _clear()


def test_workload_summary_endpoint(llm_client: TestClient) -> None:
    svc = _mock_service(
        workload_summary={
            "summary": "You have 0 active tasks.",
            "overdue_count": 0,
            "upcoming_count": 0,
        }
    )
    _override(svc)
    try:
        r = llm_client.post("/api/llm/workload-summary")
        assert r.status_code == 200
        assert "tasks" in r.json()["summary"]
    finally:
        _clear()

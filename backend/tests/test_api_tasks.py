import pytest
from fastapi.testclient import TestClient


def make_task(client: TestClient, **kwargs) -> dict:
    data = {"title": "Test task", "priority": "medium", "status": "pending", **kwargs}
    r = client.post("/api/tasks", json=data)
    assert r.status_code == 201, r.text
    return r.json()


# --- CRUD happy paths ---

def test_create_and_get(client: TestClient) -> None:
    task = make_task(client, title="Buy milk", description="2 litres", priority="low")
    r = client.get(f"/api/tasks/{task['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Buy milk"
    assert body["description"] == "2 litres"
    assert body["priority"] == "low"


def test_list_empty(client: TestClient) -> None:
    r = client.get("/api/tasks")
    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


def test_update(client: TestClient) -> None:
    task = make_task(client, title="Old title")
    r = client.patch(f"/api/tasks/{task['id']}", json={"title": "New title", "status": "done"})
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "New title"
    assert body["status"] == "done"


def test_delete(client: TestClient) -> None:
    task = make_task(client)
    r = client.delete(f"/api/tasks/{task['id']}")
    assert r.status_code == 204
    r2 = client.get(f"/api/tasks/{task['id']}")
    assert r2.status_code == 404


def test_get_not_found(client: TestClient) -> None:
    r = client.get("/api/tasks/99999")
    assert r.status_code == 404
    assert "error" in r.json()


def test_create_validation_empty_title(client: TestClient) -> None:
    r = client.post("/api/tasks", json={"title": ""})
    assert r.status_code == 422
    assert "error" in r.json()


# --- Filters ---

def test_filter_by_status(client: TestClient) -> None:
    make_task(client, title="Pending task", status="pending")
    make_task(client, title="Done task", status="done")
    r = client.get("/api/tasks?status=pending")
    items = r.json()["items"]
    assert all(t["status"] == "pending" for t in items)
    assert len(items) == 1


def test_filter_by_priority(client: TestClient) -> None:
    make_task(client, title="High", priority="high")
    make_task(client, title="Low", priority="low")
    r = client.get("/api/tasks?priority=high")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["priority"] == "high"


def test_filter_combined(client: TestClient) -> None:
    make_task(client, title="A", status="pending", priority="high")
    make_task(client, title="B", status="pending", priority="low")
    make_task(client, title="C", status="done", priority="high")
    r = client.get("/api/tasks?status=pending&priority=high")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "A"


def test_filter_due_before(client: TestClient) -> None:
    make_task(client, title="Early", due_date="2026-01-01")
    make_task(client, title="Late", due_date="2026-12-31")
    r = client.get("/api/tasks?due_before=2026-06-01")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Early"


def test_search_by_title(client: TestClient) -> None:
    make_task(client, title="Buy groceries")
    make_task(client, title="Write report")
    r = client.get("/api/tasks?q=groceries")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Buy groceries"


def test_search_by_description(client: TestClient) -> None:
    make_task(client, title="Task A", description="needs urgent attention")
    make_task(client, title="Task B", description="routine work")
    r = client.get("/api/tasks?q=urgent")
    items = r.json()["items"]
    assert len(items) == 1


def test_search_case_insensitive(client: TestClient) -> None:
    make_task(client, title="Buy MILK")
    r = client.get("/api/tasks?q=milk")
    assert r.json()["total"] == 1


def test_top_level_only(client: TestClient) -> None:
    parent = make_task(client, title="Parent")
    make_task(client, title="Child", parent_id=parent["id"])
    r = client.get("/api/tasks?top_level_only=true")
    items = r.json()["items"]
    assert all(t["parent_id"] is None for t in items)


def test_pagination(client: TestClient) -> None:
    for i in range(5):
        make_task(client, title=f"Task {i}")
    r = client.get("/api/tasks?limit=2&offset=0")
    assert len(r.json()["items"]) == 2
    assert r.json()["total"] == 5

"""
Tests covering data-integrity gaps flagged in Codex audit:
- SQLite FK enforcement (PRAGMA foreign_keys=ON)
- CASCADE delete of subtasks
- Error envelope on unknown routes and unexpected exceptions
"""
import pytest
from fastapi.testclient import TestClient


def make_task(client: TestClient, **kwargs) -> dict:
    data = {"title": "Task", "priority": "medium", "status": "pending", **kwargs}
    r = client.post("/api/tasks", json=data)
    assert r.status_code == 201, r.text
    return r.json()


# --- Cascade delete ---

def test_cascade_delete_removes_subtasks(client: TestClient) -> None:
    parent = make_task(client, title="Parent")
    child1 = make_task(client, title="Child 1", parent_id=parent["id"])
    child2 = make_task(client, title="Child 2", parent_id=parent["id"])

    r = client.delete(f"/api/tasks/{parent['id']}")
    assert r.status_code == 204

    # Both children must be gone
    assert client.get(f"/api/tasks/{child1['id']}").status_code == 404
    assert client.get(f"/api/tasks/{child2['id']}").status_code == 404


# --- FK validation: nonexistent parent ---

def test_create_with_nonexistent_parent_id(client: TestClient) -> None:
    r = client.post("/api/tasks", json={"title": "Orphan", "parent_id": 999999})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "validation_error"


def test_update_self_parent_rejected(client: TestClient) -> None:
    task = make_task(client, title="Self-parent attempt")
    r = client.patch(f"/api/tasks/{task['id']}", json={"parent_id": task["id"]})
    assert r.status_code == 400
    assert "parent" in r.json()["error"]["message"].lower()


# --- Error envelope on unknown routes ---

def test_unknown_route_returns_envelope(client: TestClient) -> None:
    r = client.get("/api/nonexistent_route_xyz")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body, f"Expected error envelope, got: {body}"
    assert "code" in body["error"]
    assert "message" in body["error"]


def test_wrong_method_returns_envelope(client: TestClient) -> None:
    r = client.put("/api/tasks")  # PUT is not defined
    assert r.status_code in (404, 405)
    body = r.json()
    assert "error" in body, f"Expected error envelope, got: {body}"

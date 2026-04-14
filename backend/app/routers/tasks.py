from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import Priority, Status, TaskCreate, TaskListResponse, TaskRead, TaskUpdate
from app.services.tasks import TaskService

router = APIRouter(tags=["tasks"])


def get_service(db: Session = Depends(get_db)) -> TaskService:
    return TaskService(db)


@router.get("/tasks", response_model=TaskListResponse)
def list_tasks(
    status: list[Status] = Query(default=[]),
    priority: list[Priority] = Query(default=[]),
    due_before: date | None = Query(default=None),
    due_after: date | None = Query(default=None),
    q: str | None = Query(default=None),
    parent_id: int | None = Query(default=None),
    top_level_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    service: TaskService = Depends(get_service),
) -> TaskListResponse:
    return service.list(
        statuses=[s.value for s in status] if status else None,
        priorities=[p.value for p in priority] if priority else None,
        due_before=due_before,
        due_after=due_after,
        q=q,
        parent_id=parent_id,
        top_level_only=top_level_only,
        limit=limit,
        offset=offset,
    )


@router.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(
    data: TaskCreate,
    service: TaskService = Depends(get_service),
) -> TaskRead:
    return service.create(data)


@router.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    service: TaskService = Depends(get_service),
) -> TaskRead:
    return service.get(task_id)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    service: TaskService = Depends(get_service),
) -> TaskRead:
    return service.update(task_id, data)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    service: TaskService = Depends(get_service),
) -> None:
    service.delete(task_id)

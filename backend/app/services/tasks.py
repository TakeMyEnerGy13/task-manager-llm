from datetime import date

from sqlalchemy.orm import Session

from app.models import Task
from app.repositories.tasks import TaskRepository
from app.schemas import TaskCreate, TaskListResponse, TaskRead, TaskUpdate


class TaskService:
    def __init__(self, db: Session) -> None:
        self.repo = TaskRepository(db)

    def create(self, data: TaskCreate) -> TaskRead:
        task = self.repo.create(data)
        return TaskRead.model_validate(task)

    def get(self, task_id: int) -> TaskRead:
        task = self.repo.get(task_id)
        return TaskRead.model_validate(task)

    def list(
        self,
        *,
        statuses: list[str] | None = None,
        priorities: list[str] | None = None,
        due_before: date | None = None,
        due_after: date | None = None,
        q: str | None = None,
        parent_id: int | None = None,
        top_level_only: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> TaskListResponse:
        tasks, total = self.repo.list(
            statuses=statuses,
            priorities=priorities,
            due_before=due_before,
            due_after=due_after,
            q=q,
            parent_id=parent_id,
            top_level_only=top_level_only,
            limit=limit,
            offset=offset,
        )
        return TaskListResponse(
            items=[TaskRead.model_validate(t) for t in tasks],
            total=total,
            limit=limit,
            offset=offset,
        )

    def update(self, task_id: int, data: TaskUpdate) -> TaskRead:
        task = self.repo.update(task_id, data)
        return TaskRead.model_validate(task)

    def delete(self, task_id: int) -> None:
        self.repo.delete(task_id)

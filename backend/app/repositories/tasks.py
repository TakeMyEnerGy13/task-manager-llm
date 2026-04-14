from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, data: TaskCreate) -> Task:
        task = Task(**data.model_dump())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get(self, task_id: int) -> Task:
        task = self.db.get(Task, task_id)
        if task is None:
            raise NotFoundError("Task", task_id)
        return task

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
    ) -> tuple[list[Task], int]:
        stmt = select(Task)

        if statuses:
            stmt = stmt.where(Task.status.in_(statuses))
        if priorities:
            stmt = stmt.where(Task.priority.in_(priorities))
        if due_before:
            stmt = stmt.where(Task.due_date <= due_before)
        if due_after:
            stmt = stmt.where(Task.due_date >= due_after)
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Task.title.ilike(pattern),
                    Task.description.ilike(pattern),
                )
            )
        if parent_id is not None:
            stmt = stmt.where(Task.parent_id == parent_id)
        elif top_level_only:
            stmt = stmt.where(Task.parent_id.is_(None))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = self.db.execute(count_stmt).scalar_one()

        stmt = stmt.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        tasks = list(self.db.execute(stmt).scalars())
        return tasks, total

    def update(self, task_id: int, data: TaskUpdate) -> Task:
        task = self.get(task_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: int) -> None:
        task = self.get(task_id)
        self.db.delete(task)
        self.db.commit()

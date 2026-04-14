from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Status(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    priority: Priority = Priority.medium
    status: Status = Status.pending
    due_date: date | None = None
    category: str | None = None
    parent_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    priority: Priority | None = None
    status: Status | None = None
    due_date: date | None = None
    category: str | None = None
    parent_id: int | None = None


class TaskRead(BaseModel):
    id: int
    title: str
    description: str | None
    priority: Priority
    status: Status
    due_date: date | None
    created_at: datetime
    category: str | None
    parent_id: int | None

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: list[TaskRead]
    total: int
    limit: int
    offset: int
